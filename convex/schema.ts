import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

/**
 * Convex owns login, profiles, Repeat access, payments, and reading history.
 * The `users` table extends Convex Auth's default user document.
 */
export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // Papers profile
    year: v.optional(v.string()),
    semester: v.optional(v.string()),
    // Repeat 2.0 access
    isPaid: v.optional(v.boolean()),
    midsemPaid: v.optional(v.boolean()),
    midsemPaidAt: v.optional(v.number()),
    paidAt: v.optional(v.number()),
    paymentProvider: v.optional(v.string()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),

  practiceProgress: defineTable({
    userId: v.id("users"), questionId: v.string(), answer: v.string(), status: v.union(v.literal("attempted"),v.literal("retry"),v.literal("understood")), updatedAt:v.number(),
  }).index("by_user",["userId"]).index("by_user_question",["userId","questionId"]),

  payments: defineTable({
    scope:v.optional(v.literal("midsem")),
    productId:v.optional(v.string()),
    userId: v.id("users"),
    provider: v.literal("dodo"),
    sessionId: v.optional(v.string()),
    paymentId: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("succeeded"),
      v.literal("failed"),
      v.literal("cancelled"),
    ),
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    source: v.union(v.literal("checkout"), v.literal("webhook"), v.literal("confirm")),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId", "updatedAt"])
    .index("by_session", ["sessionId"])
    .index("by_payment", ["paymentId"]),

  webhookEvents: defineTable({
    provider: v.literal("dodo"),
    eventId: v.string(),
    type: v.string(),
    receivedAt: v.number(),
  }).index("by_event", ["provider", "eventId"]),

  paperViews: defineTable({
    userId: v.id("users"),
    href: v.string(),
    name: v.string(),
    count: v.number(),
    firstViewedAt: v.string(),
    lastViewedAt: v.string(),
  })
    .index("by_user", ["userId", "lastViewedAt"])
    .index("by_user_href", ["userId", "href"]),

  userStats: defineTable({
    userId: v.id("users"),
    sessionCount: v.number(),
    totalTimeSpentSeconds: v.number(),
    papersThisWeek: v.number(),
    totalUniquePapers: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  solveUsage: defineTable({
    userId: v.id("users"),
    day: v.string(),
    count: v.number(),
  }).index("by_user_day", ["userId", "day"]),
});
