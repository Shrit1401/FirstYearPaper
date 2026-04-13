import { NextResponse } from "next/server";
import { getRepeatSubjectOptions } from "@/lib/repeat-catalog";
import { getRepeatIndexStatus } from "@/lib/repeat-store";
import { requirePaidAccess } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    await requirePaidAccess(request);

    const [subjects, index] = await Promise.all([
      Promise.resolve(getRepeatSubjectOptions()),
      getRepeatIndexStatus(),
    ]);

    return NextResponse.json({
      subjects,
      index,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized." ? 401 : 403;
    return NextResponse.json({ error: message }, { status });
  }
}
