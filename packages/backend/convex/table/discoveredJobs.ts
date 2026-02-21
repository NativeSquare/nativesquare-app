import { defineTable } from "convex/server";
import { v } from "convex/values";
import { generateFunctions } from "../utils/generateFunctions";

export const relevanceTierValidator = v.union(
  v.literal("gold"),
  v.literal("silver"),
  v.literal("bronze"),
);

const documentSchema = {
  userId: v.id("users"),
  upworkJobId: v.string(),
  postedAt: v.optional(v.number()),
  applied: v.boolean(),
  appliedAt: v.optional(v.number()),
  relevanceTier: v.optional(relevanceTierValidator),
};

const partialSchema = {
  userId: v.optional(v.id("users")),
  upworkJobId: v.optional(v.string()),
  postedAt: v.optional(v.number()),
  applied: v.optional(v.boolean()),
  appliedAt: v.optional(v.number()),
  relevanceTier: v.optional(relevanceTierValidator),
};

export const discoveredJobs = defineTable(documentSchema)
  .index("by_user", ["userId"])
  .index("by_user_and_job", ["userId", "upworkJobId"])
  .index("by_user_and_postedAt", ["userId", "postedAt"]);

export const {
  get,
  insert,
  patch,
  replace,
  delete: del,
} = generateFunctions("discoveredJobs", documentSchema, partialSchema);
