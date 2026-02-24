import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Daily cumulative snapshot of proposal funnel metrics per user.
 * Populated by a daily cronjob that fetches proposals from Upwork.
 * The `clientSigned` field is manual input, preserved across cronjob runs.
 */
export const proposalSnapshots = defineTable({
  userId: v.id("users"),
  date: v.string(), // "YYYY-MM-DD"
  sent: v.number(),
  seen: v.number(),
  messageReceived: v.number(),
  clientSigned: v.number(),
})
  .index("by_user_and_date", ["userId", "date"])
  .index("by_user", ["userId"]);
