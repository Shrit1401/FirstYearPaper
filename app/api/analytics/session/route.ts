import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertRepeatApiIpLimit,
  RepeatRateLimitError,
} from "@/lib/repeat-rate-limit";
import { ANALYTICS_COOKIE_NAME, signRepeatAnalyticsCookie } from "@/lib/analytics-cookie";
import { getRepeatAnalyticsSecret } from "@/lib/analytics-access";

const bodySchema = z.object({
  secret: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    await assertRepeatApiIpLimit(request);
    const secret = getRepeatAnalyticsSecret();
    if (!secret) {
      return NextResponse.json(
        { error: "Analytics gate is not configured (missing REPEAT_ANALYTICS_SECRET)." },
        { status: 503 }
      );
    }

    const { secret: provided } = bodySchema.parse(await request.json());
    if (provided !== secret) {
      return NextResponse.json({ error: "Invalid secret." }, { status: 401 });
    }

    const token = await signRepeatAnalyticsCookie(secret);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(ANALYTICS_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (error) {
    if (error instanceof RepeatRateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
