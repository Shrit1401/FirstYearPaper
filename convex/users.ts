import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";

export const YEARS = ["Year 1", "Year 2", "Year 3", "Year 4"] as const;

export async function requireUserId(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Sign in to continue.");
  return userId;
}

/** The signed-in user's profile, or null when signed out. */
export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return {
      id: user._id,
      email: user.email ?? null,
      name: user.name ?? null,
      year: user.year ?? null,
      semester: user.semester ?? null,
      isPaid: user.isPaid === true,
      midsemPaid: user.midsemPaid === true,
      paidAt: user.paidAt ?? null,
      createdAt: user._creationTime,
    };
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    year: v.optional(v.union(v.string(), v.null())),
    semester: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const patch: { name?: string; year?: string; semester?: string } = {};
    if (args.name !== undefined) {
      const name = args.name.trim().replace(/\s+/g, " ").slice(0, 80);
      if (!name) throw new ConvexError("Enter your name.");
      patch.name = name;
    }
    if (args.year !== undefined) {
      if (args.year !== null && !YEARS.includes(args.year as (typeof YEARS)[number])) {
        throw new ConvexError("Choose a valid year.");
      }
      patch.year = args.year ?? undefined;
      patch.semester = undefined;
    }
    if (args.semester !== undefined) {
      patch.semester = args.semester?.trim().slice(0, 40) || undefined;
    }
    await ctx.db.patch(userId, patch);
    return { ok: true };
  },
});
