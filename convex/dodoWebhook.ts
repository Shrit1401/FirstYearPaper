import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const TOLERANCE_SECONDS = 5 * 60;

function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}
function bytesToBase64(bytes: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}
function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Standard Webhooks verification (Dodo signs `${id}.${timestamp}.${body}` with HMAC-SHA256). */
async function verifySignature(secret: string, id: string, timestamp: string, signature: string, body: string) {
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || Math.abs(Date.now() / 1000 - seconds) > TOLERANCE_SECONDS) return false;
  const rawSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  const key = await crypto.subtle.importKey("raw", base64ToBytes(rawSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = bytesToBase64(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${timestamp}.${body}`)));
  return signature.split(" ").some((entry) => {
    const [version, value] = entry.split(",");
    return version === "v1" && value !== undefined && timingSafeEqual(value, expected);
  });
}

type PaymentEvent = {
  type?: string;
  data?: {
    payload_type?: string;
    payment_id?: string;
    checkout_session_id?: string | null;
    status?: string | null;
    total_amount?: number;
    currency?: string;
    metadata?: Record<string, string>;
    customer?: { email?: string };
  };
};

export const dodoWebhook = httpAction(async (ctx, request) => {
  const secret = process.env.DODO_PAYMENTS_WEBHOOK_KEY?.trim();
  if (!secret) return new Response("Webhook secret not configured", { status: 503 });
  const id = request.headers.get("webhook-id");
  const timestamp = request.headers.get("webhook-timestamp");
  const signature = request.headers.get("webhook-signature");
  const body = await request.text();
  if (!id || !timestamp || !signature || !(await verifySignature(secret, id, timestamp, signature, body))) {
    return new Response("Invalid signature", { status: 401 });
  }

  let event: PaymentEvent;
  try {
    event = JSON.parse(body) as PaymentEvent;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  const type = event.type ?? "unknown";

  if (!type.startsWith("payment.") || event.data?.payload_type !== "Payment" || !event.data.payment_id) {
    return new Response("Ignored", { status: 200 });
  }
  const data = event.data;
  const paymentId = data.payment_id;
  if (!paymentId) return new Response("Ignored", { status: 200 });
  const status = type === "payment.succeeded" ? "succeeded" : type === "payment.failed" ? "failed" : type === "payment.cancelled" ? "cancelled" : null;
  if (!status) return new Response("Ignored", { status: 200 });

  let userId = data.metadata?.userId as Id<"users"> | undefined;
  if (!userId && data.checkout_session_id) {
    const pending = await ctx.runQuery(internal.payments.findPendingBySession, { sessionId: data.checkout_session_id });
    userId = pending?.userId;
  }
  if (!userId) return new Response("No matching account", { status: 200 });

  await ctx.runMutation(internal.payments.applyPayment, {
    userId,
    paymentId,
    sessionId: data.checkout_session_id ?? undefined,
    status,
    amount: data.total_amount,
    currency: data.currency,
    customerEmail: data.customer?.email,
    source: "webhook",
  });
  await ctx.runMutation(internal.payments.markWebhookSeen, { eventId:id, type });
  return new Response("OK", { status: 200 });
});
