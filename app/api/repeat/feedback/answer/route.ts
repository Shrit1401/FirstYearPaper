import { NextResponse } from "next/server";
import { z } from "zod";
import { logRepeatLearningEvent } from "@/lib/repeat-learning";
import {
  assertRepeatApiIpLimit,
  assertRepeatUserGeneralLimit,
  RepeatRateLimitError,
} from "@/lib/repeat-rate-limit";
import { requirePaidAccess } from "@/lib/supabase/server";

const schema = z.object({
  sessionId: z.string().trim().min(1),
  subjectKey: z.string().trim().optional(),
  paperId: z.string().trim().optional(),
  queryText: z.string().trim().optional(),
  selectedCitationIds: z.array(z.string().trim()).optional(),
  selectedChunkIds: z.array(z.string().trim()).optional(),
  answerId: z.string().trim().min(1),
  responseHash: z.string().trim().optional(),
  clusterId: z.string().trim().optional(),
  value: z.enum(["useful", "not_useful", "bad_diagram", "incomplete", "missed_repeat_question"]),
});

export async function POST(request: Request) {
  try {
    await assertRepeatApiIpLimit(request);
    const { profile } = await requirePaidAccess(request);
    await assertRepeatUserGeneralLimit(profile.id);
    const body = schema.parse(await request.json());
    const event = await logRepeatLearningEvent({
      sessionId: body.sessionId,
      subjectKey: body.subjectKey,
      paperId: body.paperId,
      queryText: body.queryText,
      selectedCitationIds: body.selectedCitationIds,
      selectedChunkIds: body.selectedChunkIds,
      answerId: body.answerId,
      responseHash: body.responseHash,
      eventType: "answer_feedback",
      payload: {
        value: body.value,
        clusterId: body.clusterId,
      },
    });
    return NextResponse.json({ ok: true, event });
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
