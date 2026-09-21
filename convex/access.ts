import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";

/** Daily cap on tutor solutions per account, on top of the per-IP minute limit. */
export const DAILY_SOLVE_LIMIT = 150;

function today() {
  return new Date().toISOString().slice(0, 10);
}

/** Used by the Next.js solve route with the caller's token. */
export const repeatAccess = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { signedIn: false as const, paid: false as const };
    const user = await ctx.db.get(userId);
    return { signedIn: true as const, paid: user?.isPaid === true || user?.midsemPaid === true, fullAccess:user?.isPaid === true, userId };
  },
});

/** Count one solution against the daily cap. Returns false when the cap is hit. */
export const consumeSolve = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { allowed: false, reason: "signed_out" as const };
    const user = await ctx.db.get(userId);
    if (!user?.isPaid && !user?.midsemPaid) return { allowed: false, reason: "unpaid" as const };
    const day = today();
    const cap = user.isPaid ? DAILY_SOLVE_LIMIT : 20;
    const row = await ctx.db.query("solveUsage").withIndex("by_user_day", (q) => q.eq("userId", userId).eq("day", day)).unique();
    if ((row?.count ?? 0) >= cap) return { allowed: false, reason: "daily_limit" as const };
    if (row) await ctx.db.patch(row._id, { count: row.count + 1 });
    else await ctx.db.insert("solveUsage", { userId, day, count: 1 });
    return { allowed: true, reason: null, remaining: cap - (row?.count ?? 0) - 1 };
  },
});
