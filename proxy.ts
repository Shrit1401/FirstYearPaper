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
 * Convex Auth keeps the session cookie fresh on every request and serves the
 * /api/auth route. Signed-in visitors skip /auth; /profile requires a session.
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
    return analyticsGate(request);
  },
  { cookieConfig: { maxAge: 60 * 60 * 24 * 30 } },
);

export default async function proxy(
  request: NextRequest,
  event: Parameters<typeof authProxy>[1],
) {
  let pathname: string;
  try {
    pathname = decodeURIComponent(request.nextUrl.pathname);
  } catch {
    return new NextResponse("Invalid path", { status: 400 });
  }
  const target = (pdfAliases as Record<string, string>)[pathname];
  if (target)
    return NextResponse.rewrite(
      new URL(target.split("/").map(encodeURIComponent).join("/"), request.url),
    );
  if (
    pathname.startsWith("/api/archive/") ||
    pathname.toLowerCase().endsWith(".pdf")
  )
    return NextResponse.next();
  return authProxy(request, event);
}

export const config = {
  // Skip static files; run everywhere else so auth cookies stay refreshed.
  matcher: ["/:path*.pdf", "/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
