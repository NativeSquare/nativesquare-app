import { defineTable } from "convex/server";
import { v } from "convex/values";
import { generateFunctions } from "../utils/generateFunctions";

const documentSchema = {
  userId: v.id("users"),
  enabled: v.boolean(),
  maxApplicationsPerRun: v.number(),
  minBudget: v.number(),
  boostToFirstPlace: v.boolean(),
  defaultVideoLink: v.optional(v.string()),
  browserbaseContextId: v.optional(v.string()),
};

const partialSchema = {
  userId: v.optional(v.id("users")),
  enabled: v.optional(v.boolean()),
  maxApplicationsPerRun: v.optional(v.number()),
  minBudget: v.optional(v.number()),
  boostToFirstPlace: v.optional(v.boolean()),
  defaultVideoLink: v.optional(v.string()),
  browserbaseContextId: v.optional(v.string()),
};

export const autoApplySettings = defineTable(documentSchema).index("by_user", [
  "userId",
]);

export const {
  get,
  insert,
  patch,
  replace,
  delete: del,
} = generateFunctions("autoApplySettings", documentSchema, partialSchema);
