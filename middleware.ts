import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ANALYTICS_COOKIE_NAME, verifyRepeatAnalyticsCookie } from "@/lib/analytics-cookie";

function analyticsSecret(): string | undefined {
  return process.env.REPEAT_ANALYTICS_SECRET?.trim();
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (path.startsWith("/api/analytics/session")) {
    return NextResponse.next();
  }

  if (path.startsWith("/api/analytics/")) {
    const secret = analyticsSecret();
    if (process.env.NODE_ENV === "production" && !secret) {
      return NextResponse.json({ error: "Analytics API disabled." }, { status: 503 });
    }
    return NextResponse.next();
  }

  if (!path.startsWith("/analytics")) {
    return NextResponse.next();
  }

  if (path.startsWith("/analytics/gate")) {
    return NextResponse.next();
  }

  const secret = analyticsSecret();
  if (process.env.NODE_ENV === "production" && !secret) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!secret) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ANALYTICS_COOKIE_NAME)?.value;
  if (await verifyRepeatAnalyticsCookie(secret, token)) {
    return NextResponse.next();
  }

  const gate = new URL("/analytics/gate", request.url);
  gate.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(gate);
}

export const config = {
  matcher: ["/analytics/:path*", "/api/analytics/:path*"],
};
