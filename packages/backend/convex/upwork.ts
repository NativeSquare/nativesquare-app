import { Upwork } from "@nativesquare/upwork";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import {
  action,
  internalAction,
  internalMutation,
  mutation,
  query,
} from "./_generated/server";

const upwork = new Upwork(components.upwork);

// ---------------------------------------------------------------------------
// OAuth
// ---------------------------------------------------------------------------

/**
 * Return the Upwork OAuth authorization URL so the frontend can redirect.
 * The callback is handled by the component's HTTP route registered in http.ts.
 */
export const getAuthUrl = query({
  args: {},
  returns: v.string(),
  handler: async (_ctx) => {
    const clientId = process.env.UPWORK_CLIENT_ID;
    const siteUrl = process.env.CONVEX_SITE_URL;
    if (!clientId || !siteUrl) {
      throw new Error(
        "Upwork OAuth not configured: UPWORK_CLIENT_ID and CONVEX_SITE_URL required",
      );
    }
    return upwork.getAuthorizationUrl({ clientId, siteUrl });
  },
});

/**
 * Whether the Upwork account is connected (component-level, not per-user).
 */
export const getConnectionStatus = query({
  args: {},
  returns: v.union(
    v.literal("connected"),
    v.literal("disconnected"),
    v.literal("expired"),
  ),
  handler: async (ctx) => {
    return await upwork.getAuthStatus(ctx);
  },
});

// ---------------------------------------------------------------------------
// Proposals (unchanged — app-level, per-user)
// ---------------------------------------------------------------------------

const proposalDocValidator = v.object({
  _id: v.id("proposals"),
  _creationTime: v.number(),
  userId: v.id("users"),
  upworkJobId: v.string(),
  upworkJobTitle: v.string(),
  coverLetter: v.string(),
  videoLink: v.optional(v.string()),
  status: v.union(
    v.literal("sent"),
    v.literal("viewed"),
    v.literal("loom_viewed"),
    v.literal("interviewing"),
    v.literal("signed"),
  ),
  sentAt: v.number(),
  boosted: v.boolean(),
  proposalViewedAt: v.optional(v.number()),
  loomViewedAt: v.optional(v.number()),
  interviewingAt: v.optional(v.number()),
  signedAt: v.optional(v.number()),
});

export const listProposals = query({
  args: {},
  returns: v.array(proposalDocValidator),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return [];
    }
    return await ctx.db
      .query("proposals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

const funnelStatusValidator = v.union(
  v.literal("sent"),
  v.literal("viewed"),
  v.literal("loom_viewed"),
  v.literal("interviewing"),
  v.literal("signed"),
);

export const createProposal = mutation({
  args: {
    upworkJobId: v.string(),
    upworkJobTitle: v.string(),
    coverLetter: v.string(),
    videoLink: v.optional(v.string()),
    boosted: v.boolean(),
  },
  returns: v.id("proposals"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }
    return await ctx.db.insert("proposals", {
      userId,
      upworkJobId: args.upworkJobId,
      upworkJobTitle: args.upworkJobTitle,
      coverLetter: args.coverLetter,
      videoLink: args.videoLink,
      status: "sent",
      sentAt: Date.now(),
      boosted: args.boosted,
    });
  },
});

export const updateProposalStatus = mutation({
  args: {
    proposalId: v.id("proposals"),
    status: funnelStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }
    const proposal = await ctx.db.get(args.proposalId);
    if (!proposal || proposal.userId !== userId) {
      throw new Error("Proposal not found");
    }
    const now = Date.now();
    const updates: Record<string, unknown> = { status: args.status };
    if (args.status === "viewed") updates.proposalViewedAt = now;
    if (args.status === "loom_viewed") updates.loomViewedAt = now;
    if (args.status === "interviewing") updates.interviewingAt = now;
    if (args.status === "signed") updates.signedAt = now;
    await ctx.db.patch(args.proposalId, updates);
    return null;
  },
});

// ---------------------------------------------------------------------------
// Discovered jobs (per-user tracking)
// ---------------------------------------------------------------------------

const discoveredJobValidator = v.object({
  _id: v.id("discoveredJobs"),
  _creationTime: v.number(),
  userId: v.id("users"),
  upworkJobId: v.string(),
  title: v.string(),
  description: v.optional(v.string()),
  budgetInfo: v.optional(v.string()),
  budgetAmount: v.optional(v.number()),
  postedAt: v.optional(v.number()),
  applied: v.boolean(),
  appliedAt: v.optional(v.number()),
  proposalId: v.optional(v.id("proposals")),
});

export const getDiscoveredJob = query({
  args: {
    jobId: v.id("discoveredJobs"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }
    const job = await ctx.db.get(args.jobId);
    if (!job || job.userId !== userId) {
      return null;
    }
    return job;
  },
});

export const listDiscoveredJobs = query({
  args: {
    appliedOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return [];
    }
    if (args.appliedOnly === true) {
      const jobs = await ctx.db
        .query("discoveredJobs")
        .withIndex("by_user_and_applied", (q) =>
          q.eq("userId", userId).eq("applied", true),
        )
        .collect();
      return jobs.sort(
        (a, b) =>
          (b.postedAt ?? b._creationTime) - (a.postedAt ?? a._creationTime),
      );
    }
    const jobs = await ctx.db
      .query("discoveredJobs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return jobs.sort(
      (a, b) =>
        (b.postedAt ?? b._creationTime) - (a.postedAt ?? a._creationTime),
    );
  },
});

export const markJobApplied = mutation({
  args: {
    jobId: v.id("discoveredJobs"),
    proposalId: v.id("proposals"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }
    const job = await ctx.db.get(args.jobId);
    if (!job || job.userId !== userId) {
      throw new Error("Job not found");
    }
    await ctx.db.patch(args.jobId, {
      applied: true,
      appliedAt: Date.now(),
      proposalId: args.proposalId,
    });
    return null;
  },
});

export const addDiscoveredJob = mutation({
  args: {
    upworkJobId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    budgetInfo: v.optional(v.string()),
    postedAt: v.optional(v.number()),
  },
  returns: v.id("discoveredJobs"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }
    const existing = await ctx.db
      .query("discoveredJobs")
      .withIndex("by_user_and_job", (q) =>
        q.eq("userId", userId).eq("upworkJobId", args.upworkJobId),
      )
      .unique();
    if (existing) {
      return existing._id;
    }
    return await ctx.db.insert("discoveredJobs", {
      userId,
      upworkJobId: args.upworkJobId,
      title: args.title,
      description: args.description,
      budgetInfo: args.budgetInfo,
      postedAt: args.postedAt,
      applied: false,
    });
  },
});

// ---------------------------------------------------------------------------
// Discovery rate limiting & status
// ---------------------------------------------------------------------------

const MANUAL_REFRESH_DAILY_CAP = 3;

function getTodayUtcDateString(): string {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

export const getDiscoveryStatus = query({
  args: {},
  returns: v.object({
    manualRefreshCountToday: v.number(),
    manualRefreshCap: v.number(),
    lastRunAt: v.union(v.number(), v.null()),
  }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return {
        manualRefreshCountToday: 0,
        manualRefreshCap: MANUAL_REFRESH_DAILY_CAP,
        lastRunAt: null,
      };
    }
    const today = getTodayUtcDateString();
    const logRow = await ctx.db
      .query("discoveryRefreshLog")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", today),
      )
      .unique();
    const runs = await ctx.db
      .query("discoveryRuns")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(1);
    return {
      manualRefreshCountToday: logRow?.count ?? 0,
      manualRefreshCap: MANUAL_REFRESH_DAILY_CAP,
      lastRunAt: runs[0]?.runAt ?? null,
    };
  },
});

export const runDiscovery = mutation({
  args: {},
  returns: v.object({
    allowed: v.boolean(),
    message: v.optional(v.string()),
  }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return { allowed: false, message: "Not authenticated" };
    }
    const today = getTodayUtcDateString();
    const existing = await ctx.db
      .query("discoveryRefreshLog")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", today),
      )
      .unique();
    const count = existing?.count ?? 0;
    if (count >= MANUAL_REFRESH_DAILY_CAP) {
      return {
        allowed: false,
        message: "Refresh limit reached for today. Try again tomorrow.",
      };
    }
    if (existing) {
      await ctx.db.patch(existing._id, { count: count + 1 });
    } else {
      await ctx.db.insert("discoveryRefreshLog", {
        userId,
        date: today,
        count: 1,
      });
    }
    await ctx.scheduler.runAfter(0, internal.upwork.runDiscoveryForUser, {
      userId,
      source: "manual" as const,
    });
    return { allowed: true };
  },
});

// ---------------------------------------------------------------------------
// Internal: discovery run tracking
// ---------------------------------------------------------------------------

export const recordDiscoveryRun = internalMutation({
  args: {
    userId: v.id("users"),
    source: v.union(v.literal("cron"), v.literal("manual")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("discoveryRuns", {
      userId: args.userId,
      runAt: Date.now(),
      source: args.source,
    });
    return null;
  },
});

export const addDiscoveredJobForUser = internalMutation({
  args: {
    userId: v.id("users"),
    upworkJobId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    budgetInfo: v.optional(v.string()),
    budgetAmount: v.optional(v.number()),
    postedAt: v.optional(v.number()),
  },
  returns: v.id("discoveredJobs"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("discoveredJobs")
      .withIndex("by_user_and_job", (q) =>
        q.eq("userId", args.userId).eq("upworkJobId", args.upworkJobId),
      )
      .unique();
    if (existing) {
      return existing._id;
    }
    return await ctx.db.insert("discoveredJobs", {
      userId: args.userId,
      upworkJobId: args.upworkJobId,
      title: args.title,
      description: args.description,
      budgetInfo: args.budgetInfo,
      budgetAmount: args.budgetAmount,
      postedAt: args.postedAt,
      applied: false,
    });
  },
});

// ---------------------------------------------------------------------------
// Internal: run discovery using the @nativesquare/upwork component
// ---------------------------------------------------------------------------

export const runDiscoveryForUser = internalAction({
  args: {
    userId: v.id("users"),
    source: v.union(v.literal("cron"), v.literal("manual")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.upwork.recordDiscoveryRun, {
      userId: args.userId,
      source: args.source,
    });

    const clientId = process.env.UPWORK_CLIENT_ID;
    const clientSecret = process.env.UPWORK_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      console.error(
        "[Upwork Discovery] UPWORK_CLIENT_ID or UPWORK_CLIENT_SECRET missing",
      );
      return null;
    }

    let result;
    try {
      result = await upwork.searchJobPostings(ctx, {
        clientId,
        clientSecret,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.error("[Upwork Discovery] Search failed:", message);
      return null;
    }

    console.log(
      `[Upwork Discovery] Fetched ${result.postings.length} jobs (totalCount: ${result.totalCount}) for user ${args.userId}`,
    );

    for (const posting of result.postings) {
      let budgetAmount: number | undefined;
      if (posting.budgetAmount) {
        const parsed = parseFloat(posting.budgetAmount);
        if (!isNaN(parsed)) budgetAmount = parsed;
      }

      let budgetInfo: string | undefined;
      if (posting.budgetAmount && posting.budgetCurrency) {
        budgetInfo = `${posting.budgetCurrency} ${posting.budgetAmount}`;
      } else if (posting.budgetAmount) {
        budgetInfo = posting.budgetAmount;
      }
      if (posting.duration) {
        budgetInfo = budgetInfo
          ? `${budgetInfo} · ${posting.duration}`
          : posting.duration;
      }

      let postedAt: number | undefined;
      if (posting.createdDateTime) {
        const parsed = Date.parse(posting.createdDateTime);
        if (!isNaN(parsed)) postedAt = parsed;
      }

      const description = posting.description
        ? posting.description.slice(0, 2000)
        : undefined;

      await ctx.runMutation(internal.upwork.addDiscoveredJobForUser, {
        userId: args.userId,
        upworkJobId: posting.upworkId,
        title: posting.title,
        description,
        budgetInfo,
        budgetAmount,
        postedAt,
      });
    }

    return null;
  },
});

// ---------------------------------------------------------------------------
// Internal: scheduled discovery for all users with auto-apply settings
// ---------------------------------------------------------------------------

export const runScheduledDiscovery = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const allSettings = await ctx.db.query("autoApplySettings").collect();
    const userIds = [...new Set(allSettings.map((s) => s.userId))];
    for (const userId of userIds) {
      await ctx.scheduler.runAfter(0, internal.upwork.runDiscoveryForUser, {
        userId,
        source: "cron" as const,
      });
    }
    return null;
  },
});

// ---------------------------------------------------------------------------
// Placeholder for manual job search (unused, kept for API compat)
// ---------------------------------------------------------------------------

export const discoverJobs = action({
  args: {
    minBudget: v.optional(v.number()),
    keyword: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      upworkJobId: v.string(),
      title: v.string(),
      description: v.optional(v.string()),
      budgetInfo: v.optional(v.string()),
      postedAt: v.optional(v.number()),
    }),
  ),
  handler: async (_ctx, _args) => {
    return [];
  },
});
