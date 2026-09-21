import { ConvexError } from "convex/values";

/** Convex Auth surfaces raw provider errors; map them to sentences a student can act on. */
export function describeAuthError(error: unknown, flow: "signIn" | "signUp"): string {
  const data = error instanceof ConvexError ? error.data : null;
  const raw = typeof data === "string" ? data : typeof data === "object" && data && "message" in data ? String((data as { message: unknown }).message) : error instanceof Error ? error.message : "";
  const text = raw.toLowerCase();
  if (text.includes("invalidaccountid") || text.includes("invalidsecret") || text.includes("invalid password") || text.includes("could not verify")) {
    return flow === "signIn" ? "That email and password do not match. Check both and try again." : "That email is already registered. Sign in instead.";
  }
  if (text.includes("already exists") || text.includes("account already")) return "That email is already registered. Sign in instead.";
  if (text.includes("too many") || text.includes("rate")) return "Too many attempts. Wait a minute and try again.";
  if (text.includes("network") || text.includes("fetch")) return "Could not reach the server. Check your connection and try again.";
  if (raw && raw.length < 140 && !text.includes("uncaught") && !text.includes("server error")) return raw;
  return flow === "signIn" ? "Could not sign you in. Please try again." : "Could not create your account. Please try again.";
}
