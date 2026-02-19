import { defineTable } from "convex/server";
import { v } from "convex/values";

const documentSchema = {
  userId: v.id("users"),
  accessToken: v.string(),
  refreshToken: v.string(),
  expiresAt: v.number(),
};

export const upworkCredentials = defineTable(documentSchema).index(
  "by_user",
  ["userId"],
);
