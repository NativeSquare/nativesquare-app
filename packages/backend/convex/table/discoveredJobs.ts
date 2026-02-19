import { defineTable } from "convex/server";
import { v } from "convex/values";
import { generateFunctions } from "../utils/generateFunctions";

const documentSchema = {
  userId: v.id("users"),
  upworkJobId: v.string(),
  title: v.string(),
  description: v.optional(v.string()),
  budgetInfo: v.optional(v.string()),
  postedAt: v.optional(v.number()),
  applied: v.boolean(),
  appliedAt: v.optional(v.number()),
  proposalId: v.optional(v.id("proposals")),
};

const partialSchema = {
  userId: v.optional(v.id("users")),
  upworkJobId: v.optional(v.string()),
  title: v.optional(v.string()),
  description: v.optional(v.string()),
  budgetInfo: v.optional(v.string()),
  postedAt: v.optional(v.number()),
  applied: v.optional(v.boolean()),
  appliedAt: v.optional(v.number()),
  proposalId: v.optional(v.id("proposals")),
};

export const discoveredJobs = defineTable(documentSchema)
  .index("by_user", ["userId"])
  .index("by_user_and_job", ["userId", "upworkJobId"])
  .index("by_user_and_applied", ["userId", "applied"])
  .index("by_user_and_postedAt", ["userId", "postedAt"]);

export const {
  get,
  insert,
  patch,
  replace,
  delete: del,
} = generateFunctions("discoveredJobs", documentSchema, partialSchema);
