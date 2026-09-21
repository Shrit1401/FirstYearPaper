"use node";

import DodoPayments from "dodopayments";
import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

function dodoClient() {
  const bearerToken = process.env.DODO_PAYMENTS_API_KEY?.trim();
  if (!bearerToken) throw new ConvexError("Payments are not configured yet. Set DODO_PAYMENTS_API_KEY in Convex.");
  const environment = process.env.DODO_ENVIRONMENT === "live_mode" ? "live_mode" : "test_mode";
  return new DodoPayments({ bearerToken, environment });
}

function siteUrl() {
  const raw = process.env.SITE_URL?.trim().replace(/\/$/, "");
  if (!raw) throw new ConvexError("SITE_URL is not set in Convex.");
  return raw;
}

/** Start a ₹29 Repeat 2.0 checkout on Dodo and return the hosted checkout URL. */
export const createCheckout = action({
  args: {},
  handler: async (ctx): Promise<{ checkoutUrl: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to buy Repeat access.");
    const user = await ctx.runQuery(internal.payments.getUserForCheckout, { userId });
    if (!user) throw new ConvexError("Account not found.");
    if (user.isPaid) throw new ConvexError("This account already has Repeat access.");
    const productId = process.env.DODO_MIDSEM_PRODUCT_ID?.trim();
    if (!productId) throw new ConvexError("Payments are not configured yet. Set DODO_MIDSEM_PRODUCT_ID in Convex.");
    if (!user.email) throw new ConvexError("Add an email to your account before paying.");

    const client = dodoClient();
    const product = await client.products.retrieve(productId);
    const price = product.price;
    if (price.type !== "one_time_price" || price.price !== 2900 || price.currency !== "INR" || price.discount !== 0 || !price.tax_inclusive || price.pay_what_you_want || price.purchasing_power_parity) throw new ConvexError("The midsem product must be a fixed, tax-inclusive ₹29 one-time price.");
    const session = await client.checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: { email: user.email, name: user.name ?? undefined },
      billing_currency: "INR",
      return_url: `${siteUrl()}/repeat/payment/thank-you`,
      cancel_url: `${siteUrl()}/repeat`,
      metadata: { userId, product: "repeat-2.0-midsem" },
      customization: { theme: "dark", show_order_details: true },
      feature_flags: { allow_discount_code: false, allow_tax_id: false, allow_phone_number_collection: true },
    });
    if (!session.checkout_url) throw new ConvexError("Dodo did not return a checkout link. Please try again.");
    await ctx.runMutation(internal.payments.recordCheckout, { userId, sessionId: session.session_id, productId });
    return { checkoutUrl: session.checkout_url };
  },
});

/**
 * After Dodo redirects back, verify the payment directly with Dodo so access
 * is granted even if the webhook is delayed. The payment must belong to the
 * signed-in user (metadata.userId set at checkout).
 */
export const confirmPayment = action({
  args: { paymentId: v.string() },
  handler: async (ctx, { paymentId }): Promise<{ status: string; granted: boolean }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to confirm your payment.");
    if (!/^[A-Za-z0-9_-]{6,128}$/.test(paymentId)) throw new ConvexError("Invalid payment reference.");
    const payment = await dodoClient().payments.retrieve(paymentId);
    const owner = payment.metadata?.userId;
    if (owner !== userId) throw new ConvexError("This payment belongs to a different account.");
    const status = payment.status ?? "processing";
    if (status !== "succeeded") return { status, granted: false };
    const result = await ctx.runMutation(internal.payments.applyPayment, {
      userId: userId as Id<"users">,
      paymentId: payment.payment_id,
      sessionId: payment.checkout_session_id ?? undefined,
      status: "succeeded",
      amount: payment.total_amount,
      currency: payment.currency,
      customerEmail: payment.customer?.email ?? undefined,
      source: "confirm",
    });
    return { status, granted: result.granted };
  },
});
