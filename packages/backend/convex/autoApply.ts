import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { pendingApplicationStatus } from "./table/pendingApplications";

// ---------------------------------------------------------------------------
// Settings CRUD
// ---------------------------------------------------------------------------

export const getSettings = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("autoApplySettings"),
      enabled: v.boolean(),
      maxApplicationsPerRun: v.number(),
      minBudget: v.number(),
      boostToFirstPlace: v.boolean(),
      defaultVideoLink: v.optional(v.string()),
      browserbaseContextId: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const settings = await ctx.db
      .query("autoApplySettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!settings) return null;
    return {
      _id: settings._id,
      enabled: settings.enabled,
      maxApplicationsPerRun: settings.maxApplicationsPerRun,
      minBudget: settings.minBudget,
      boostToFirstPlace: settings.boostToFirstPlace,
      defaultVideoLink: settings.defaultVideoLink,
      browserbaseContextId: settings.browserbaseContextId,
    };
  },
});

export const updateSettings = mutation({
  args: {
    enabled: v.optional(v.boolean()),
    maxApplicationsPerRun: v.optional(v.number()),
    minBudget: v.optional(v.number()),
    boostToFirstPlace: v.optional(v.boolean()),
    defaultVideoLink: v.optional(v.string()),
    browserbaseContextId: v.optional(v.string()),
  },
  returns: v.id("autoApplySettings"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("autoApplySettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      const updates: Record<string, unknown> = {};
      if (args.enabled !== undefined) updates.enabled = args.enabled;
      if (args.maxApplicationsPerRun !== undefined)
        updates.maxApplicationsPerRun = args.maxApplicationsPerRun;
      if (args.minBudget !== undefined) updates.minBudget = args.minBudget;
      if (args.boostToFirstPlace !== undefined)
        updates.boostToFirstPlace = args.boostToFirstPlace;
      if (args.defaultVideoLink !== undefined)
        updates.defaultVideoLink = args.defaultVideoLink;
      if (args.browserbaseContextId !== undefined)
        updates.browserbaseContextId = args.browserbaseContextId;
      await ctx.db.patch(existing._id, updates);
      return existing._id;
    }

    return await ctx.db.insert("autoApplySettings", {
      userId,
      enabled: args.enabled ?? false,
      maxApplicationsPerRun: args.maxApplicationsPerRun ?? 3,
      minBudget: args.minBudget ?? 5000,
      boostToFirstPlace: args.boostToFirstPlace ?? true,
      defaultVideoLink: args.defaultVideoLink,
      browserbaseContextId: args.browserbaseContextId,
    });
  },
});

// ---------------------------------------------------------------------------
// Pending applications
// ---------------------------------------------------------------------------

export const listPendingApplications = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("pendingApplications"),
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
    }),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const items = await ctx.db
      .query("pendingApplications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);
    return items.map((item) => ({
      _id: item._id,
      discoveredJobId: item.discoveredJobId,
      upworkJobId: item.upworkJobId,
      jobTitle: item.jobTitle,
      budgetAmount: item.budgetAmount,
      coverLetter: item.coverLetter,
      videoLink: item.videoLink,
      status: item.status,
      createdAt: item.createdAt,
      submittedAt: item.submittedAt,
      errorMessage: item.errorMessage,
    }));
  },
});

export const approveApplication = mutation({
  args: { applicationId: v.id("pendingApplications") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const app = await ctx.db.get(args.applicationId);
    if (!app || app.userId !== userId) throw new Error("Application not found");
    if (app.status !== "pending") throw new Error("Application is not pending");
    await ctx.db.patch(args.applicationId, { status: "approved" });
    await ctx.scheduler.runAfter(
      0,
      internal.autoApplyActions.submitApprovedApplication,
      {
        applicationId: args.applicationId,
        userId,
      },
    );
    return null;
  },
});

export const rejectApplication = mutation({
  args: { applicationId: v.id("pendingApplications") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const app = await ctx.db.get(args.applicationId);
    if (!app || app.userId !== userId) throw new Error("Application not found");
    if (app.status !== "pending") throw new Error("Application is not pending");
    await ctx.db.patch(args.applicationId, { status: "rejected" });
    return null;
  },
});

// ---------------------------------------------------------------------------
// Internal: settings reader for actions
// ---------------------------------------------------------------------------

export const getSettingsInternal = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(
    v.object({
      enabled: v.boolean(),
      maxApplicationsPerRun: v.number(),
      minBudget: v.number(),
      boostToFirstPlace: v.boolean(),
      defaultVideoLink: v.optional(v.string()),
      browserbaseContextId: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("autoApplySettings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
    if (!settings) return null;
    return {
      enabled: settings.enabled,
      maxApplicationsPerRun: settings.maxApplicationsPerRun,
      minBudget: settings.minBudget,
      boostToFirstPlace: settings.boostToFirstPlace,
      defaultVideoLink: settings.defaultVideoLink,
      browserbaseContextId: settings.browserbaseContextId,
    };
  },
});

// ---------------------------------------------------------------------------
// Internal: fetch candidate jobs for auto-apply
// ---------------------------------------------------------------------------

export const getCandidateJobs = internalQuery({
  args: {
    userId: v.id("users"),
    minBudget: v.number(),
    limit: v.number(),
  },
  returns: v.array(
    v.object({
      _id: v.id("discoveredJobs"),
      upworkJobId: v.string(),
      title: v.string(),
      description: v.optional(v.string()),
      budgetAmount: v.optional(v.number()),
      postedAt: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, args) => {
    const jobs = await ctx.db
      .query("discoveredJobs")
      .withIndex("by_user_and_applied", (q) =>
        q.eq("userId", args.userId).eq("applied", false),
      )
      .order("desc")
      .collect();

    const alreadyPending = await ctx.db
      .query("pendingApplications")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", args.userId).eq("status", "pending"),
      )
      .collect();
    const pendingJobIds = new Set(alreadyPending.map((p) => p.upworkJobId));

    const filtered = jobs.filter(
      (j) =>
        j.budgetAmount !== undefined &&
        j.budgetAmount >= args.minBudget &&
        !pendingJobIds.has(j.upworkJobId),
    );

    filtered.sort(
      (a, b) =>
        (b.postedAt ?? b._creationTime) - (a.postedAt ?? a._creationTime),
    );

    return filtered.slice(0, args.limit).map((j) => ({
      _id: j._id,
      upworkJobId: j.upworkJobId,
      title: j.title,
      description: j.description,
      budgetAmount: j.budgetAmount,
      postedAt: j.postedAt,
    }));
  },
});

// ---------------------------------------------------------------------------
// Internal: insert a pending application
// ---------------------------------------------------------------------------

export const insertPendingApplication = internalMutation({
  args: {
    userId: v.id("users"),
    discoveredJobId: v.id("discoveredJobs"),
    upworkJobId: v.string(),
    jobTitle: v.string(),
    budgetAmount: v.optional(v.number()),
    coverLetter: v.string(),
    videoLink: v.optional(v.string()),
  },
  returns: v.id("pendingApplications"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("pendingApplications", {
      userId: args.userId,
      discoveredJobId: args.discoveredJobId,
      upworkJobId: args.upworkJobId,
      jobTitle: args.jobTitle,
      budgetAmount: args.budgetAmount,
      coverLetter: args.coverLetter,
      videoLink: args.videoLink,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

// ---------------------------------------------------------------------------
// Internal: update pending application status after submission attempt
// ---------------------------------------------------------------------------

export const updatePendingApplicationStatus = internalMutation({
  args: {
    applicationId: v.id("pendingApplications"),
    status: pendingApplicationStatus,
    errorMessage: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = { status: args.status };
    if (args.status === "submitted") updates.submittedAt = Date.now();
    if (args.errorMessage !== undefined)
      updates.errorMessage = args.errorMessage;
    await ctx.db.patch(args.applicationId, updates);
    return null;
  },
});

// ---------------------------------------------------------------------------
// Internal: record a submitted proposal and mark job applied
// ---------------------------------------------------------------------------

export const recordSubmittedProposal = internalMutation({
  args: {
    userId: v.id("users"),
    discoveredJobId: v.id("discoveredJobs"),
    upworkJobId: v.string(),
    upworkJobTitle: v.string(),
    coverLetter: v.string(),
    videoLink: v.optional(v.string()),
    boosted: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const proposalId = await ctx.db.insert("proposals", {
      userId: args.userId,
      upworkJobId: args.upworkJobId,
      upworkJobTitle: args.upworkJobTitle,
      coverLetter: args.coverLetter,
      videoLink: args.videoLink,
      status: "sent",
      sentAt: Date.now(),
      boosted: args.boosted,
    });
    await ctx.db.patch(args.discoveredJobId, {
      applied: true,
      appliedAt: Date.now(),
      proposalId,
    });
    return null;
  },
});

// ---------------------------------------------------------------------------
// Internal: read a pending application for the action
// ---------------------------------------------------------------------------

export const getPendingApplicationInternal = internalQuery({
  args: { applicationId: v.id("pendingApplications") },
  returns: v.union(
    v.object({
      discoveredJobId: v.id("discoveredJobs"),
      upworkJobId: v.string(),
      jobTitle: v.string(),
      coverLetter: v.string(),
      videoLink: v.optional(v.string()),
      status: pendingApplicationStatus,
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const app = await ctx.db.get(args.applicationId);
    if (!app) return null;
    return {
      discoveredJobId: app.discoveredJobId,
      upworkJobId: app.upworkJobId,
      jobTitle: app.jobTitle,
      coverLetter: app.coverLetter,
      videoLink: app.videoLink,
      status: app.status,
    };
  },
});

// ---------------------------------------------------------------------------
// Cron entry point: schedule auto-apply with jitter
// ---------------------------------------------------------------------------

const JITTER_MAX_MS = 2 * 60 * 60 * 1000; // 2 hours

export const runScheduledAutoApply = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const allSettings = await ctx.db.query("autoApplySettings").collect();
    const enabledUserIds = [
      ...new Set(
        allSettings.filter((s) => s.enabled).map((s) => s.userId),
      ),
    ];
    for (const userId of enabledUserIds) {
      const jitterMs = Math.floor(Math.random() * JITTER_MAX_MS);
      await ctx.scheduler.runAfter(
        jitterMs,
        internal.autoApplyActions.runAutoApplyWorkflow,
        { userId },
      );
    }
    return null;
  },
});
