import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Tracks manual "Refresh jobs" usage per user per day for daily cap.
 */
export const discoveryRefreshLog = defineTable({
  userId: v.id("users"),
  date: v.string(), // "YYYY-MM-DD"
  count: v.number(),
})
  .index("by_user_and_date", ["userId", "date"]);
