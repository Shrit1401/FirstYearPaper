import { NextResponse } from "next/server";
import { z } from "zod";
import { consumeRepeatSolve } from "@/lib/convex-server";
import { assertRepeatV2SolveLimit } from "@/lib/repeat-v2-limits";
import { prepareRepeatV2Solution, readOpenAIResponseEvents, upstreamSolveError } from "@/lib/repeat-v2-solve";
import { readRepeatV2Paper, RepeatV2Error } from "@/lib/repeat-v2-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

const requestSchema = z.object({
  paperId: z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/),
  questionId: z.string().min(1).max(256),
  prompt: z.string().trim().min(1).max(4000).optional(),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(16_000),
  }).strict()).max(12).optional(),
}).strict();

async function readBoundedBody(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new RepeatV2Error("Send the question request as JSON.", "invalid_request", 415);
  }
  const maxBytes = 80_000;
  const length = Number(request.headers.get("content-length") || 0);
  if (length > maxBytes) throw new RepeatV2Error("This conversation is too long. Start a fresh solution.", "request_too_large", 413);
  if (!request.body) throw new RepeatV2Error("Select a question to solve.", "invalid_request", 400);
  const reader = request.body.getReader();
  const parts: Uint8Array[] = [];
  let received = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maxBytes) {
        await reader.cancel();
        throw new RepeatV2Error("This conversation is too long. Start a fresh solution.", "request_too_large", 413);
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return requestSchema.parse(JSON.parse(Buffer.concat(parts).toString("utf8")));
  } catch {
    throw new RepeatV2Error("Select a valid question and keep follow-up messages under 4,000 characters.", "invalid_request", 400);
  }
}

function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (request.headers.get("sec-fetch-site") === "cross-site" || (origin && origin !== new URL(request.url).origin)) {
    throw new RepeatV2Error("Open Repeat to ask for a solution.", "origin_not_allowed", 403);
  }
}

export async function POST(request: Request) {
  let cleanup = () => {};
  try {
    assertSameOrigin(request);
    const body = await readBoundedBody(request);
    const paper = await readRepeatV2Paper(body.paperId);
    const question = paper.questions.find((entry) => entry.id === body.questionId);
    if (!question) throw new RepeatV2Error("Question not found in the selected paper.", "question_not_found", 404);
    if (question.preparedSolution && !body.prompt && !body.history?.length) {
      const answerMarkdown=question.preparedSolution;
      const frames=`event: start\ndata: ${JSON.stringify({questionId:question.id,model:"prepared-solution"})}\n\nevent: done\ndata: ${JSON.stringify({answerMarkdown,responseId:null})}\n\n`;
      return new Response(frames,{headers:{"Content-Type":"text/event-stream; charset=utf-8","Cache-Control":"no-store"}});
    }
    const access = await consumeRepeatSolve();
    if (access.state === "signed_out") throw new RepeatV2Error("Sign in to ask the tutor.", "unauthorized", 401);
    if (access.state === "unpaid") throw new RepeatV2Error("Repeat 2.0 solutions need a one-time ₹29 midsem pass.", "payment_required", 402);
    if (access.state === "daily_limit") throw new RepeatV2Error("You have reached today's solution limit. It resets at midnight UTC.", "daily_limit", 429);
    if (!access.fullAccess && !paper.memberships.some(m=>m.examType === "MIDSEM")) throw new RepeatV2Error("Your pass covers midsem questions. Choose a midsem paper.","midsem_only",403);
    await assertRepeatV2SolveLimit(request);
    const prepared = await prepareRepeatV2Solution(paper, question, body);

    const abortController = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; abortController.abort(); }, 170_000);
    const onAbort = () => abortController.abort();
    request.signal.addEventListener("abort", onAbort, { once: true });
    if (request.signal.aborted) abortController.abort();
    cleanup = () => {
      clearTimeout(timeout);
      request.signal.removeEventListener("abort", onAbort);
    };
    let upstream: Response;
    try {
      upstream = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${prepared.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(prepared.body),
        signal: abortController.signal,
        cache: "no-store",
      });
    } catch {
      throw new RepeatV2Error(
        timedOut ? "The teacher took too long to respond. Please try again." : "The teacher's connection was interrupted. Please try again.",
        timedOut ? "solver_timeout" : "upstream_unavailable",
        timedOut ? 504 : 502,
      );
    }
    if (!upstream.ok || !upstream.body) {
      await upstream.body?.cancel();
      throw upstreamSolveError(upstream.status);
    }
    const upstreamBody = upstream.body;
    const encoder = new TextEncoder();
    let closed = false;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const send = (event: string, payload: object) => {
          if (!closed) controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`));
        };
        const keepalive = setInterval(() => {
          if (!closed) controller.enqueue(encoder.encode(": keepalive\n\n"));
        }, 15_000);
        void (async () => {
          let answerMarkdown = "";
          let responseId: string | null = null;
          let completed = false;
          try {
            send("start", { questionId: question.id, model: prepared.body.model });
            for await (const event of readOpenAIResponseEvents(upstreamBody)) {
              if (closed) break;
              if (event.response?.id) responseId = event.response.id;
              if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
                answerMarkdown += event.delta;
                send("delta", { text: event.delta });
              } else if (event.type === "response.refusal.delta" && event.delta) {
                answerMarkdown += event.delta;
                send("delta", { text: event.delta });
              } else if (event.type === "response.completed") {
                completed = true;
                break;
              } else if (event.type === "response.incomplete") {
                throw new RepeatV2Error(
                  event.response?.incomplete_details?.reason === "max_output_tokens"
                    ? "The solution reached its output limit before finishing. Ask to continue from the last completed step."
                    : "The teacher could not complete this solution. Try a more focused follow-up.",
                  "solution_incomplete",
                  502,
                );
              } else if (event.type === "response.failed" || event.type === "error") {
                throw new RepeatV2Error("The teacher could not finish this solution. Please try again.", "solution_failed", 502);
              }
            }
            if (!closed) {
              if (!completed || !answerMarkdown.trim()) {
                throw new RepeatV2Error("The solution stream ended before a complete answer arrived. Please try again.", "stream_interrupted", 502);
              }
              send("done", { answerMarkdown, responseId });
            }
          } catch (error) {
            if (!closed) {
              send("error", {
                error: timedOut
                  ? "The teacher took too long to finish. Please try again or ask a more focused follow-up."
                  : error instanceof RepeatV2Error ? error.message : "The solution stream was interrupted. Please try again.",
                code: timedOut ? "solver_timeout" : error instanceof RepeatV2Error ? error.code : "stream_interrupted",
              });
            }
          } finally {
            clearInterval(keepalive);
            cleanup();
            abortController.abort();
            if (!closed) {
              closed = true;
              controller.close();
            }
          }
        })();
      },
      cancel() {
        closed = true;
        abortController.abort();
        cleanup();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-store, no-transform",
        "X-Accel-Buffering": "no",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    cleanup();
    const known = error instanceof RepeatV2Error;
    const status = known ? error.status : 500;
    return NextResponse.json(
      { error: known ? error.message : "The teacher could not start this solution. Please try again.", code: known ? error.code : "solver_unavailable" },
      { status, headers: { "Cache-Control": "no-store", ...(status === 429 ? { "Retry-After": "60" } : {}) } },
    );
  }
}
