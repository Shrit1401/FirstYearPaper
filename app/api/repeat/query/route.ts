import { NextResponse } from "next/server";
import { z } from "zod";
import { answerRepeatQuery } from "@/lib/repeat-ai";
import { createRepeatResponseHash, logRepeatLearningEvent } from "@/lib/repeat-learning";
import { requirePaidAccess } from "@/lib/supabase/server";

const requestSchema = z.object({
  mode: z.enum(["compare", "chat"]),
  prompt: z.string().trim().min(1),
  subjectKey: z.string().trim().optional(),
  currentPaperId: z.string().trim().optional(),
  sessionId: z.string().trim().optional(),
  intent: z.enum(["repeat_questions", "common_topics", "revision_list", "custom"]).optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .max(12)
    .optional(),
});

export async function POST(request: Request) {
  try {
    await requirePaidAccess(request);
    const body = requestSchema.parse(await request.json());
    const response = await answerRepeatQuery(body);
    const selectedCitationIds = response.citations.map((citation) => citation.id);
    const responseHash = createRepeatResponseHash(
      response.answerMarkdown,
      response.citations.map((citation) => citation.chunkId)
    );

    await logRepeatLearningEvent({
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
      await logRepeatLearningEvent({
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
