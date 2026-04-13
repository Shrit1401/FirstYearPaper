import { NextResponse } from "next/server";
import { z } from "zod";
import { logRepeatLearningEvent } from "@/lib/repeat-learning";
import {
  assertRepeatApiIpLimit,
  assertRepeatUserGeneralLimit,
  RepeatRateLimitError,
} from "@/lib/repeat-rate-limit";
import { requirePaidAccess } from "@/lib/supabase/server";

const eventSchema = z.object({
  sessionId: z.string().trim().min(1),
  subjectKey: z.string().trim().optional(),
  paperId: z.string().trim().optional(),
  queryText: z.string().trim().optional(),
  selectedCitationIds: z.array(z.string().trim()).optional(),
  answerId: z.string().trim().optional(),
  responseHash: z.string().trim().optional(),
  eventType: z.enum([
    "citation_open",
    "paper_open",
    "repeat_question_click",
    "query_reformulated",
    "follow_up_asked",
  ]),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    await assertRepeatApiIpLimit(request);
    const { profile } = await requirePaidAccess(request);
    await assertRepeatUserGeneralLimit(profile.id);
    const body = eventSchema.parse(await request.json());
    const event = await logRepeatLearningEvent(body);
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
