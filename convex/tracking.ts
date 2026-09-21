import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./users";

const trackedPaper = v.object({
  href: v.string(),
  name: v.string(),
  count: v.number(),
  firstViewedAt: v.string(),
  lastViewedAt: v.string(),
});

/** Merge the device's local reading history into the account. */
export const sync = mutation({
  args: {
    papers: v.array(trackedPaper),
    sessionCount: v.number(),
    totalTimeSpent: v.number(),
    papersThisWeek: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    if (args.papers.length > 2000) throw new Error("Too many papers in one sync.");
    const now = Date.now();

    const existingStats = await ctx.db.query("userStats").withIndex("by_user", (q) => q.eq("userId", userId)).unique();
    const stats = {
      userId,
      sessionCount: Math.max(existingStats?.sessionCount ?? 0, Math.floor(args.sessionCount)),
      totalTimeSpentSeconds: Math.max(existingStats?.totalTimeSpentSeconds ?? 0, Math.floor(args.totalTimeSpent)),
      papersThisWeek: Math.floor(args.papersThisWeek),
      totalUniquePapers: args.papers.length,
      updatedAt: now,
    };
    if (existingStats) await ctx.db.patch(existingStats._id, stats);
    else await ctx.db.insert("userStats", stats);

    for (const paper of args.papers) {
      const href = paper.href.slice(0, 2048);
      const existing = await ctx.db
        .query("paperViews")
        .withIndex("by_user_href", (q) => q.eq("userId", userId).eq("href", href))
        .unique();
      const row = {
        userId,
        href,
        name: paper.name.slice(0, 512),
        count: Math.max(existing?.count ?? 0, Math.floor(paper.count)),
        firstViewedAt: existing && existing.firstViewedAt < paper.firstViewedAt ? existing.firstViewedAt : paper.firstViewedAt,
        lastViewedAt: existing && existing.lastViewedAt > paper.lastViewedAt ? existing.lastViewedAt : paper.lastViewedAt,
      };
      if (existing) await ctx.db.patch(existing._id, row);
      else await ctx.db.insert("paperViews", row);
    }
    return { ok: true };
  },
});

/** Reading history saved to the account, newest first. */
export const history = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const papers = await ctx.db
      .query("paperViews")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(200);
    const stats = await ctx.db.query("userStats").withIndex("by_user", (q) => q.eq("userId", userId)).unique();
    return {
      papers: papers.map(({ href, name, count, firstViewedAt, lastViewedAt }) => ({ href, name, count, firstViewedAt, lastViewedAt })),
      sessionCount: stats?.sessionCount ?? 0,
      totalTimeSpent: stats?.totalTimeSpentSeconds ?? 0,
    };
  },
});
