import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

/**
 * Reads the Convex Auth token from the request cookies. Returns undefined when
 * there is no Next.js request context (unit tests) or the visitor is signed out.
 */
export async function readConvexToken(): Promise<string | undefined> {
  try {
    const { convexAuthNextjsToken } = await import("@convex-dev/auth/nextjs/server");
    return await convexAuthNextjsToken();
  } catch {
    return undefined;
  }
}

export type RepeatAccess =
  | { state: "signed_out" }
  | { state: "unpaid" }
  | { state: "daily_limit" }
  | { state: "ok"; userId: string; remaining: number; fullAccess:boolean };

/** Verifies Repeat 2.0 access for the current request and counts one solution. */
export async function consumeRepeatSolve(): Promise<RepeatAccess> {
  const token = await readConvexToken();
  if (!token || !process.env.NEXT_PUBLIC_CONVEX_URL) return { state: "signed_out" };
  const access = await fetchQuery(api.access.repeatAccess, {}, { token });
  if (!access.signedIn) return { state: "signed_out" };
  if (!access.paid) return { state: "unpaid" };
  const usage = await fetchMutation(api.access.consumeSolve, {}, { token });
  if (!usage.allowed) return usage.reason === "daily_limit" ? { state: "daily_limit" } : usage.reason === "unpaid" ? { state: "unpaid" } : { state: "signed_out" };
  return { state: "ok", userId: access.userId, remaining: usage.remaining ?? 0, fullAccess:access.fullAccess };
}

/** Read-only access check for Repeat 2.0 data routes (catalog, papers). */
export async function readRepeatAccess(): Promise<"signed_out" | "unpaid" | "ok"> {
  const token = await readConvexToken();
  if (!token || !process.env.NEXT_PUBLIC_CONVEX_URL) return "signed_out";
  const access = await fetchQuery(api.access.repeatAccess, {}, { token });
  if (!access.signedIn) return "signed_out";
  return access.paid ? "ok" : "unpaid";
}
