import { defineTable } from "convex/server";
import { v } from "convex/values";
import { generateFunctions } from "../utils/generateFunctions";

export const pendingApplicationStatus = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("submitted"),
  v.literal("failed"),
);

const documentSchema = {
  userId: v.id("users"),
  discoveredJobId: v.id("discoveredJobs"),
  upworkJobId: v.string(),
  jobTitle: v.string(),
  budgetAmount: v.optional(v.number()),
  coverLetter: v.string(),
  videoLink: v.optional(v.string()),
  status: pendingApplicationStatus,
  createdAt: v.number(),
  submittedAt: v.optional(v.number()),
  errorMessage: v.optional(v.string()),
};

const partialSchema = {
  userId: v.optional(v.id("users")),
  discoveredJobId: v.optional(v.id("discoveredJobs")),
  upworkJobId: v.optional(v.string()),
  jobTitle: v.optional(v.string()),
  budgetAmount: v.optional(v.number()),
  coverLetter: v.optional(v.string()),
  videoLink: v.optional(v.string()),
  status: v.optional(pendingApplicationStatus),
  createdAt: v.optional(v.number()),
  submittedAt: v.optional(v.number()),
  errorMessage: v.optional(v.string()),
};

export const pendingApplications = defineTable(documentSchema)
  .index("by_user", ["userId"])
  .index("by_user_and_status", ["userId", "status"]);

export const {
  get,
  insert,
  patch,
  replace,
  delete: del,
} = generateFunctions(
  "pendingApplications",
  documentSchema,
  partialSchema,
);
