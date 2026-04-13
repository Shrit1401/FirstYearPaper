import { cookies } from "next/headers";
import {
  ANALYTICS_COOKIE_NAME,
  verifyRepeatAnalyticsCookie,
} from "@/lib/analytics-cookie";

export function getRepeatAnalyticsSecret(): string | undefined {
  const s = process.env.REPEAT_ANALYTICS_SECRET?.trim();
  return s || undefined;
}

/**
 * Protects analytics export APIs. In production without REPEAT_ANALYTICS_SECRET, analytics is off.
 * With a secret set, allows: matching HttpOnly cookie (from POST /api/analytics/session), raw secret
 * in x-repeat-analytics-secret, or Authorization: Bearer <same secret> for scripted exports.
 */
export async function assertRepeatAnalyticsApiAccess(request: Request): Promise<void> {
  const secret = getRepeatAnalyticsSecret();
  const isProd = process.env.NODE_ENV === "production";

  if (isProd && !secret) {
    throw new Error("Analytics API disabled.");
  }

  if (!secret) {
    return;
  }

  if (request.headers.get("x-repeat-analytics-secret") === secret) {
    return;
  }

  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ") && auth.slice("Bearer ".length).trim() === secret) {
    return;
  }

  const jar = await cookies();
  const token = jar.get(ANALYTICS_COOKIE_NAME)?.value;
  if (await verifyRepeatAnalyticsCookie(secret, token)) {
    return;
  }

  throw new Error("Unauthorized.");
}
