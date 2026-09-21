import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { query, mutation } from "./_generated/server";
import ids from "../lib/midsem-question-ids.json";
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const id = await getAuthUserId(ctx);
    if (!id) return [];
    const user = await ctx.db.get(id);
    if (!user?.isPaid && !user?.midsemPaid) return [];
    return ctx.db
      .query("practiceProgress")
      .withIndex("by_user", (q) => q.eq("userId", id))
      .collect();
  },
});
export const save = mutation({
  args: {
    questionId: v.string(),
    answer: v.string(),
    status: v.union(
      v.literal("attempted"),
      v.literal("retry"),
      v.literal("understood"),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to save practice.");
    const user = await ctx.db.get(userId);
    if (!user?.isPaid && !user?.midsemPaid)
      throw new ConvexError("A midsem practice pass is required.");
    if (!ids.includes(args.questionId) || args.answer.length > 12000)
      throw new ConvexError("Invalid practice answer.");
    const row = await ctx.db
      .query("practiceProgress")
      .withIndex("by_user_question", (q) =>
        q.eq("userId", userId).eq("questionId", args.questionId),
      )
      .unique();
    const data = { ...args, userId, updatedAt: Date.now() };
    if (row) await ctx.db.patch(row._id, data);
    else await ctx.db.insert("practiceProgress", data);
  },
});
