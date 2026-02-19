import { defineTable } from "convex/server";
import { v } from "convex/values";
import { generateFunctions } from "../utils/generateFunctions";

const funnelStatus = v.union(
  v.literal("sent"),
  v.literal("viewed"),
  v.literal("loom_viewed"),
  v.literal("interviewing"),
  v.literal("signed"),
);

const documentSchema = {
  userId: v.id("users"),
  upworkJobId: v.string(),
  upworkJobTitle: v.string(),
  coverLetter: v.string(),
  videoLink: v.optional(v.string()),
  status: funnelStatus,
  sentAt: v.number(),
  boosted: v.boolean(),
  // Optional: set when we get data from Upwork
  proposalViewedAt: v.optional(v.number()),
  loomViewedAt: v.optional(v.number()),
  interviewingAt: v.optional(v.number()),
  signedAt: v.optional(v.number()),
};

const partialSchema = {
  userId: v.optional(v.id("users")),
  upworkJobId: v.optional(v.string()),
  upworkJobTitle: v.optional(v.string()),
  coverLetter: v.optional(v.string()),
  videoLink: v.optional(v.string()),
  status: v.optional(funnelStatus),
  sentAt: v.optional(v.number()),
  boosted: v.optional(v.boolean()),
  proposalViewedAt: v.optional(v.number()),
  loomViewedAt: v.optional(v.number()),
  interviewingAt: v.optional(v.number()),
  signedAt: v.optional(v.number()),
};

export const proposals = defineTable(documentSchema)
  .index("by_user", ["userId"])
  .index("by_user_and_status", ["userId", "status"])
  .index("by_user_and_job", ["userId", "upworkJobId"]);

export const {
  get,
  insert,
  patch,
  replace,
  delete: del,
} = generateFunctions("proposals", documentSchema, partialSchema);
