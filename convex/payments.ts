import { matchesMidsemPayment } from "../lib/midsem-payment";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { requireUserId } from "./users";

/** Repeat 2.0 pricing. Amounts are in the smallest currency unit (paise). */
export const REPEAT_PRICE = { amount: 2900, currency: "INR", display: "₹29" } as const;

export const pricing = query({
  args: {},
  handler: async () => ({ ...REPEAT_PRICE, configured: Boolean(process.env.DODO_PAYMENTS_API_KEY && process.env.DODO_MIDSEM_PRODUCT_ID) }),
});

/** Payment rows for the signed-in user, newest first. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db.query("payments").withIndex("by_user", (q) => q.eq("userId", userId)).order("desc").take(20);
    return rows.map((row) => ({
      id: row._id,
      status: row.status,
      paymentId: row.paymentId ?? null,
      amount: row.amount ?? null,
      currency: row.currency ?? null,
      createdAt: row._creationTime,
      updatedAt: row.updatedAt,
    }));
  },
});

/** Record a pending checkout so the webhook can be matched to an account. */
export const recordCheckout = internalMutation({
  args: { userId: v.id("users"), sessionId: v.string(), productId:v.string() },
  handler: async (ctx, { userId, sessionId, productId }) => {
    await ctx.db.insert("payments", { userId, provider: "dodo", sessionId, productId, scope:"midsem", status: "pending", source: "checkout", updatedAt: Date.now() });
  },
});

export const getUserForCheckout = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return { email: user.email ?? null, name: user.name ?? null, isPaid: user.isPaid === true || user.midsemPaid === true };
  },
});

export const currentUserId = mutation({
  args: {},
  handler: async (ctx) => requireUserId(ctx),
});

/**
 * Idempotently apply a payment outcome. Called by the webhook and by the
 * post-checkout confirmation, so either path can grant access first.
 */
export const applyPayment = internalMutation({
  args: {
    userId: v.id("users"),
    paymentId: v.string(),
    sessionId: v.optional(v.string()),
    status: v.union(v.literal("succeeded"), v.literal("failed"), v.literal("cancelled")),
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    source: v.union(v.literal("webhook"), v.literal("confirm")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const byPayment = await ctx.db.query("payments").withIndex("by_payment", (q) => q.eq("paymentId", args.paymentId)).first();
    const bySession = !byPayment && args.sessionId
      ? await ctx.db.query("payments").withIndex("by_session", (q) => q.eq("sessionId", args.sessionId)).first()
      : null;
    const existing = byPayment ?? bySession;
    if (!existing || existing.userId !== args.userId) return { granted:false, alreadyApplied:false };
    if (args.status === "succeeded" && !matchesMidsemPayment(existing,args,process.env.DODO_MIDSEM_PRODUCT_ID)) return { granted:false, alreadyApplied:false };
    const row = {
      userId: args.userId,
      provider: "dodo" as const,
      sessionId: args.sessionId ?? existing?.sessionId,
      paymentId: args.paymentId,
      status: args.status,
      amount: args.amount,
      currency: args.currency,
      customerEmail: args.customerEmail,
      source: args.source,
      updatedAt: now,
    };
    if (existing) {
      // Never downgrade a succeeded payment because of a late "processing" event.
      if (existing.status === "succeeded" && args.status !== "succeeded") return { granted: false, alreadyApplied: true };
      await ctx.db.patch(existing._id, row);
    } else {
      await ctx.db.insert("payments", row);
    }
    if (args.status !== "succeeded") return { granted: false, alreadyApplied: false };
    const user = await ctx.db.get(args.userId);
    if (!user) return { granted: false, alreadyApplied: false };
    if (user.isPaid || user.midsemPaid) return { granted: true, alreadyApplied: true };
    await ctx.db.patch(args.userId, { midsemPaid: true, midsemPaidAt: now, paymentProvider: "dodo" });
    return { granted: true, alreadyApplied: false };
  },
});

export const findPendingBySession = internalQuery({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    const row = await ctx.db.query("payments").withIndex("by_session", (q) => q.eq("sessionId", sessionId)).first();
    return row ? { userId: row.userId } : null;
  },
});

export const markWebhookSeen = internalMutation({
  args: { eventId: v.string(), type: v.string() },
  handler: async (ctx, { eventId, type }) => {
    const seen = await ctx.db.query("webhookEvents").withIndex("by_event", (q) => q.eq("provider", "dodo").eq("eventId", eventId)).unique();
    if (seen) return { duplicate: true };
    await ctx.db.insert("webhookEvents", { provider: "dodo", eventId, type, receivedAt: Date.now() });
    return { duplicate: false };
  },
});
