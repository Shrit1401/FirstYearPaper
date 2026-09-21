import { NextResponse } from "next/server";
/** Repeat 1.1 is retired. All live tutoring uses the authenticated, scoped v2 route. */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Repeat 1.1 has moved to Repeat 2.0. Open /repeat/library to ask the tutor.",
      code: "repeat_v1_retired",
    },
    { status: 410 },
  );
}
