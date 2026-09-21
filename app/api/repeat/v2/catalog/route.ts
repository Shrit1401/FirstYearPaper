import { NextResponse } from "next/server";
import { readRepeatV2Catalog, RepeatV2Error } from "@/lib/repeat-v2-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await readRepeatV2Catalog(), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const known = error instanceof RepeatV2Error;
    return NextResponse.json(
      { error: known ? error.message : "The question library could not be loaded.", code: known ? error.code : "library_unavailable" },
      { status: known ? error.status : 503 },
    );
  }
}
