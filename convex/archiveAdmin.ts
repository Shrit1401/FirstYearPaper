import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Administrative import only. Never expose upload credentials to visitors.
export const uploadUrls = internalMutation({
  args: { count: v.number() },
  handler: async (ctx, { count }) => {
    if (!Number.isInteger(count) || count < 1 || count > 500)
      throw new Error("Invalid batch size");
    return Promise.all(
      Array.from({ length: count }, () => ctx.storage.generateUploadUrl()),
    );
  },
});
export const fileUrls = internalQuery({
  args: { ids: v.array(v.id("_storage")) },
  handler: async (ctx, { ids }) => {
    if (ids.length > 1000) throw new Error("Invalid batch size");
    return Promise.all(ids.map((id) => ctx.storage.getUrl(id)));
  },
});
