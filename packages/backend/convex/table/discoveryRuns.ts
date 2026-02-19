import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Records each discovery run (cron or manual) for "Last updated at" display.
 */
export const discoveryRuns = defineTable({
  userId: v.id("users"),
  runAt: v.number(),
  source: v.union(v.literal("cron"), v.literal("manual")),
}).index("by_user", ["userId"]);
