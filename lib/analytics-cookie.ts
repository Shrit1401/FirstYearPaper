const PURPOSE = "repeat-analytics-v1";

export const ANALYTICS_COOKIE_NAME = "repeat_analytics";

function uint8ToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  const b64 = btoa(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** HMAC-SHA256 cookie token; works in Edge (middleware) and Node (route handlers). */
export async function signRepeatAnalyticsCookie(secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(PURPOSE));
  return uint8ToBase64Url(new Uint8Array(sig));
}

export async function verifyRepeatAnalyticsCookie(
  secret: string,
  cookieValue: string | undefined
): Promise<boolean> {
  if (!cookieValue) return false;
  const expected = await signRepeatAnalyticsCookie(secret);
  return expected.length === cookieValue.length && expected === cookieValue;
}
