import { NextResponse } from "next/server";
import { readRepeatV2Paper, RepeatV2Error } from "@/lib/repeat-v2-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return NextResponse.json(await readRepeatV2Paper(id), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const known = error instanceof RepeatV2Error;
    return NextResponse.json(
      { error: known ? error.message : "This paper could not be loaded.", code: known ? error.code : "paper_unavailable" },
      { status: known ? error.status : 503 },
    );
  }
}
