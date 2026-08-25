import { NextResponse } from "next/server";
import { getRepeatSubjectOptions } from "@/lib/repeat-catalog";
import { getRepeatIndexStatus } from "@/lib/repeat-store";
import {
  assertRepeatApiIpLimit,
  RepeatRateLimitError,
} from "@/lib/repeat-rate-limit";

export async function GET(request: Request) {
  try {
    await assertRepeatApiIpLimit(request);

    const [subjects, index] = await Promise.all([
      Promise.resolve(getRepeatSubjectOptions()),
      getRepeatIndexStatus(),
    ]);
    const yearOneSubjects = subjects.filter((subject) => subject.yearLabel === "Year 1");

    return NextResponse.json({
      subjects: yearOneSubjects,
      index,
      scopeYear: "Year 1",
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
