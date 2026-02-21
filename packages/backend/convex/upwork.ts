import { Upwork } from "@nativesquare/upwork";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { components, internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import { relevanceTierValidator } from "./table/discoveredJobs";

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
  handler: async () => {
    return upwork.getAuthorizationUrl();
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
// Discovered jobs (per-user tracking)
// ---------------------------------------------------------------------------

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
    const posting = await ctx.runQuery(
      components.upwork.public.getJobPosting,
      { upworkId: job.upworkJobId },
    );
    return {
      ...job,
      title: posting?.title ?? null,
      description: posting?.description ?? null,
      budgetAmount: posting?.budgetAmount
        ? parseFloat(posting.budgetAmount)
        : null,
      budgetCurrency: posting?.budgetCurrency ?? null,
      clientCompanyName: posting?.clientCompanyName ?? null,
      clientTotalHires: posting?.clientTotalHires ?? null,
    };
  },
});

export const listDiscoveredJobs = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return { page: [], isDone: true, continueCursor: "" };
    }
    const result = await ctx.db
      .query("discoveredJobs")
      .withIndex("by_user_and_postedAt", (q) => q.eq("userId", userId))
      .order("desc")
      .paginate(args.paginationOpts);

    const postings = await upwork.listJobPostings(ctx);
    const postingsMap = new Map(postings.map((p) => [p.upworkId, p]));

    const enrichedPage = result.page.map((job) => {
      const p = postingsMap.get(job.upworkJobId);
      return {
        ...job,
        title: p?.title ?? null,
        budgetAmount: p?.budgetAmount ? parseFloat(p.budgetAmount) : null,
        budgetCurrency: p?.budgetCurrency ?? null,
      };
    });

    return { ...result, page: enrichedPage };
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
    postedAt: v.optional(v.number()),
    relevanceTier: v.optional(relevanceTierValidator),
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
      postedAt: args.postedAt,
      applied: false,
      relevanceTier: args.relevanceTier,
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

    let result;
    try {
      result = await upwork.searchJobPostings(ctx);
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

      const relevanceTier =
        budgetAmount !== undefined && budgetAmount >= 5000
          ? ("gold" as const)
          : budgetAmount !== undefined && budgetAmount >= 1000
            ? ("silver" as const)
            : ("bronze" as const);

      let postedAt: number | undefined;
      if (posting.createdDateTime) {
        const parsed = Date.parse(posting.createdDateTime);
        if (!isNaN(parsed)) postedAt = parsed;
      }

      await ctx.runMutation(internal.upwork.addDiscoveredJobForUser, {
        userId: args.userId,
        upworkJobId: posting.upworkId,
        postedAt,
        relevanceTier,
      });
    }

    return null;
  },
});

// ---------------------------------------------------------------------------
// Internal: scheduled discovery for all users who have run discovery before
// ---------------------------------------------------------------------------

export const runScheduledDiscovery = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const allRuns = await ctx.db.query("discoveryRuns").collect();
    const userIds = [...new Set(allRuns.map((r) => r.userId))];
    for (const userId of userIds) {
      await ctx.scheduler.runAfter(0, internal.upwork.runDiscoveryForUser, {
        userId,
        source: "cron" as const,
      });
    }
    return null;
  },
});

