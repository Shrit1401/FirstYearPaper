import pdfAliases from "@/lib/pdf-aliases.json";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";
import {
  ANALYTICS_COOKIE_NAME,
  verifyRepeatAnalyticsCookie,
} from "@/lib/analytics-cookie";

function analyticsSecret(): string | undefined {
  return process.env.REPEAT_ANALYTICS_SECRET?.trim();
}

const isAuthPage = createRouteMatcher(["/auth"]);
const isProfilePage = createRouteMatcher(["/profile"]);

async function analyticsGate(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (path.startsWith("/api/analytics/session")) return NextResponse.next();

  if (path.startsWith("/api/analytics/")) {
    const secret = analyticsSecret();
    if (process.env.NODE_ENV === "production" && !secret) {
      return NextResponse.json(
        { error: "Analytics API disabled." },
        { status: 503 },
      );
    }
    return NextResponse.next();
  }

  if (!path.startsWith("/analytics") || path.startsWith("/analytics/gate"))
    return NextResponse.next();

  const secret = analyticsSecret();
  if (process.env.NODE_ENV === "production" && !secret) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  if (!secret) return NextResponse.next();

  const token = request.cookies.get(ANALYTICS_COOKIE_NAME)?.value;
  if (await verifyRepeatAnalyticsCookie(secret, token))
    return NextResponse.next();

  const gate = new URL("/analytics/gate", request.url);
  gate.searchParams.set(
    "next",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );
  return NextResponse.redirect(gate);
}

/**
 * Refresh sessions only for account features and authenticated APIs. Public
 * pages and file downloads never need a per-request authentication function.
 */
const authProxy = convexAuthNextjsMiddleware(
  async (request, { convexAuth }) => {
    if (isAuthPage(request) && (await convexAuth.isAuthenticated())) {
      const next = request.nextUrl.searchParams.get("next");
      return nextjsMiddlewareRedirect(
        request,
        next && next.startsWith("/") && !next.startsWith("//")
          ? next
          : "/profile",
      );
    }
    if (isProfilePage(request) && !(await convexAuth.isAuthenticated())) {
      return nextjsMiddlewareRedirect(request, "/auth?next=/profile");
    }
    return NextResponse.next();
  },
  { cookieConfig: { maxAge: 60 * 60 * 24 * 30 } },
);

export default async function proxy(
  request: NextRequest,
  event: Parameters<typeof authProxy>[1],
) {
  const pathname = request.nextUrl.pathname;
  if (pathname.toLowerCase().endsWith(".pdf")) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(pathname);
    } catch {
      return new NextResponse("Invalid path", { status: 400 });
    }
    const target = (pdfAliases as Record<string, string>)[decoded];
    return target
      ? NextResponse.rewrite(new URL(target.split("/").map(encodeURIComponent).join("/"), request.url))
      : NextResponse.next();
  }
  if (request.nextUrl.pathname.startsWith("/analytics") ||
      request.nextUrl.pathname.startsWith("/api/analytics/")) {
    return analyticsGate(request);
  }
  return authProxy(request, event);
}

export const config = {
  matcher: [
    // Legacy shared PDF URLs still need alias resolution, but never auth.
    "/:path*.pdf",
    "/auth/:path*", "/profile/:path*", "/repeat/:path*", "/api/auth/:path*",
    "/api/repeat/query", "/api/repeat/v2/solve",
    "/analytics/:path*", "/api/analytics/:path*",
  ],
};
