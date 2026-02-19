import { defineTable } from "convex/server";
import { v } from "convex/values";

const documentSchema = {
  state: v.string(),
  userId: v.id("users"),
  createdAt: v.number(),
};

export const upworkOAuthState = defineTable(documentSchema).index(
  "by_state",
  ["state"],
);
