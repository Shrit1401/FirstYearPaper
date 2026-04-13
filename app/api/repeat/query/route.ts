import { NextResponse } from "next/server";
import { z } from "zod";
import { answerRepeatQuery } from "@/lib/repeat-ai";
import { createRepeatResponseHash, logRepeatLearningEvent } from "@/lib/repeat-learning";
import {
  assertRepeatApiIpLimit,
  assertRepeatUserQueryLimit,
  RepeatRateLimitError,
} from "@/lib/repeat-rate-limit";
import { requirePaidAccess } from "@/lib/supabase/server";

const requestSchema = z.object({
  mode: z.enum(["compare", "chat"]),
  prompt: z.string().trim().min(1).max(24_000),
  subjectKey: z.string().trim().max(512).optional(),
  currentPaperId: z.string().trim().max(512).optional(),
  sessionId: z.string().trim().max(256).optional(),
  intent: z.enum(["repeat_questions", "common_topics", "revision_list", "custom"]).optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(16_000),
      })
    )
    .max(12)
    .optional(),
  stream: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    await assertRepeatApiIpLimit(request);
    const { profile } = await requirePaidAccess(request);
    await assertRepeatUserQueryLimit(profile.id);
    const body = requestSchema.parse(await request.json());
    if (body.stream) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          function send(event: string, payload: Record<string, unknown>) {
            controller.enqueue(
              encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`)
            );
          }

          void (async () => {
            try {
              send("stage", { stage: "retrieving_sources" });
              const response = await answerRepeatQuery(body, {
                onStage: (stage) => send("stage", { stage }),
              });
              send("result", response);

              const selectedCitationIds = response.citations.map((citation) => citation.id);
              const responseHash = createRepeatResponseHash(
                response.answerMarkdown,
                response.citations.map((citation) => citation.chunkId)
              );
              void logRepeatLearningEvent({
                sessionId: body.sessionId ?? "anonymous",
                subjectKey: body.subjectKey,
                paperId: body.currentPaperId,
                queryText: body.prompt,
                selectedCitationIds,
                answerId: response.answerId,
                responseHash,
                eventType: "query_submitted",
                payload: {
                  mode: body.mode,
                  intent: body.intent ?? "custom",
                  confidence: response.confidence,
                },
              });

              if (body.history?.some((turn) => turn.role === "user")) {
                void logRepeatLearningEvent({
                  sessionId: body.sessionId ?? "anonymous",
                  subjectKey: body.subjectKey,
                  paperId: body.currentPaperId,
                  queryText: body.prompt,
                  selectedCitationIds,
                  answerId: response.answerId,
                  responseHash,
                  eventType: body.mode === "chat" ? "follow_up_asked" : "query_reformulated",
                  payload: {
                    mode: body.mode,
                    priorTurns: body.history.length,
                  },
                });
              }
            } catch (error) {
              const message = error instanceof Error ? error.message : "Unknown error";
              send("error", { error: message });
            } finally {
              controller.close();
            }
          })();
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    const response = await answerRepeatQuery(body);
    const selectedCitationIds = response.citations.map((citation) => citation.id);
    const responseHash = createRepeatResponseHash(
      response.answerMarkdown,
      response.citations.map((citation) => citation.chunkId)
    );

    void logRepeatLearningEvent({
      sessionId: body.sessionId ?? "anonymous",
      subjectKey: body.subjectKey,
      paperId: body.currentPaperId,
      queryText: body.prompt,
      selectedCitationIds,
      answerId: response.answerId,
      responseHash,
      eventType: "query_submitted",
      payload: {
        mode: body.mode,
        intent: body.intent ?? "custom",
        confidence: response.confidence,
      },
    });

    if (body.history?.some((turn) => turn.role === "user")) {
      void logRepeatLearningEvent({
        sessionId: body.sessionId ?? "anonymous",
        subjectKey: body.subjectKey,
        paperId: body.currentPaperId,
        queryText: body.prompt,
        selectedCitationIds,
        answerId: response.answerId,
        responseHash,
        eventType: body.mode === "chat" ? "follow_up_asked" : "query_reformulated",
        payload: {
          mode: body.mode,
          priorTurns: body.history.length,
        },
      });
    }

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof RepeatRateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    const status =
      error instanceof z.ZodError
        ? 400
        : message === "Unauthorized."
          ? 401
          : message === "Repeat is locked for this account."
            ? 403
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
