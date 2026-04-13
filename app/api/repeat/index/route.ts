import { NextResponse } from "next/server";
import { getRepeatSubjectOptions } from "@/lib/repeat-catalog";
import { getRepeatIndexStatus } from "@/lib/repeat-store";
import {
  assertRepeatApiIpLimit,
  assertRepeatUserGeneralLimit,
  RepeatRateLimitError,
} from "@/lib/repeat-rate-limit";
import { requirePaidAccess } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    await assertRepeatApiIpLimit(request);
    const { profile } = await requirePaidAccess(request);
    await assertRepeatUserGeneralLimit(profile.id);

    const [subjects, index] = await Promise.all([
      Promise.resolve(getRepeatSubjectOptions()),
      getRepeatIndexStatus(),
    ]);

    return NextResponse.json({
      subjects,
      index,
    });
  } catch (error) {
    if (error instanceof RepeatRateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    const status =
      message === "Unauthorized."
        ? 401
        : message === "Repeat is locked for this account."
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
