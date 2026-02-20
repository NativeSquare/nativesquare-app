import { getAuthUserId } from "@convex-dev/auth/server";
import { alphabet, generateRandomString } from "oslo/crypto";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";

const UPWORK_AUTH_BASE =
  "https://www.upwork.com/ab/account-security/oauth2/authorize";

/**
 * Start Upwork OAuth: create state, return auth URL.
 * Frontend redirects the user to the returned authUrl.
 */
export const initiateConnect = mutation({
  args: {
    redirectUri: v.optional(v.string()),
  },
  returns: v.object({
    authUrl: v.string(),
    state: v.string(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const state = generateRandomString(32, alphabet("a-z", "A-Z", "0-9"));
    // Prefer env so production uses one canonical redirect URI (must match Upwork app settings).
    const redirectUri =
      (process.env.UPWORK_REDIRECT_URI as string | undefined) ??
      args.redirectUri ??
      "";
    const clientId = process.env.UPWORK_CLIENT_ID as string | undefined;
    if (!clientId || !redirectUri) {
      throw new Error(
        "Upwork OAuth not configured: UPWORK_CLIENT_ID and UPWORK_REDIRECT_URI (or redirectUri) required",
      );
    }

    await ctx.db.insert("upworkOAuthState", {
      state,
      userId,
      createdAt: Date.now(),
    });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      state,
    });
    const authUrl = `${UPWORK_AUTH_BASE}?${params.toString()}`;

    // Log so you can verify env and OAuth URL in Convex dashboard → Logs
    console.log("[Upwork OAuth] Initiate — redirect_uri:", redirectUri);
    console.log("[Upwork OAuth] Initiate — client_id:", clientId);
    console.log("[Upwork OAuth] Initiate — full auth URL:", authUrl);

    return { authUrl, state };
  },
});

/**
 * Store tokens after OAuth callback. Called from Next.js API route with the
 * state returned by Upwork and the tokens from the token exchange.
 * Validates state and associates credentials with the user who initiated.
 */
export const storeTokens = mutation({
  args: {
    state: v.string(),
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresIn: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("upworkOAuthState")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .unique();
    if (!row) {
      throw new Error("Invalid or expired OAuth state");
    }
    const userId = row.userId;

    const expiresAt = Date.now() + args.expiresIn * 1000;

    const existing = await ctx.db
      .query("upworkCredentials")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        expiresAt,
      });
    } else {
      await ctx.db.insert("upworkCredentials", {
        userId,
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        expiresAt,
      });
    }

    await ctx.db.delete(row._id);
    return null;
  },
});

/**
 * Debug: look up an OAuth state to verify it was issued by this app.
 * Returns when the state was created (if found). Use to confirm the callback
 * state matches a flow we started (e.g. state=vV8NHhq6osnGMHeMOoydXldRZ5Cunpf4).
 * Does not return user id or other sensitive data.
 */
export const getUpworkStateInfo = query({
  args: { state: v.string() },
  returns: v.union(
    v.object({
      found: v.literal(true),
      createdAt: v.number(),
    }),
    v.object({ found: v.literal(false) }),
  ),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("upworkOAuthState")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .unique();
    if (!row) {
      return { found: false as const };
    }
    return { found: true as const, createdAt: row.createdAt };
  },
});

/**
 * Whether the current user has connected Upwork.
 */
export const getConnectionStatus = query({
  args: {},
  returns: v.union(
    v.object({
      connected: v.literal(true),
      credentialsId: v.id("upworkCredentials"),
    }),
    v.object({ connected: v.literal(false) }),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return { connected: false as const };
    }
    const creds = await ctx.db
      .query("upworkCredentials")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!creds) {
      return { connected: false as const };
    }
    return {
      connected: true as const,
      credentialsId: creds._id,
    };
  },
});

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

/**
 * List current user's proposals for the funnel view.
 */
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

const discoveredJobValidator = v.object({
  _id: v.id("discoveredJobs"),
  _creationTime: v.number(),
  userId: v.id("users"),
  upworkJobId: v.string(),
  title: v.string(),
  description: v.optional(v.string()),
  budgetInfo: v.optional(v.string()),
  postedAt: v.optional(v.number()),
  applied: v.boolean(),
  appliedAt: v.optional(v.number()),
  proposalId: v.optional(v.id("proposals")),
});

/**
 * Get a single discovered job by id. Returns null if not found or not owned by current user.
 */
export const getDiscoveredJob = query({
  args: {
    jobId: v.id("discoveredJobs"),
  },
  returns: v.union(discoveredJobValidator, v.null()),
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

/**
 * List current user's discovered jobs (what to apply to), sorted by posting date (newer first).
 */
export const listDiscoveredJobs = query({
  args: {
    appliedOnly: v.optional(v.boolean()),
  },
  returns: v.array(discoveredJobValidator),
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

const funnelStatusValidator = v.union(
  v.literal("sent"),
  v.literal("viewed"),
  v.literal("loom_viewed"),
  v.literal("interviewing"),
  v.literal("signed"),
);

/**
 * Record a new proposal after the user sends (and optionally boosts) via Upwork.
 * Call this after a successful apply/boost so the funnel is populated.
 */
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
    const sentAt = Date.now();
    return await ctx.db.insert("proposals", {
      userId,
      upworkJobId: args.upworkJobId,
      upworkJobTitle: args.upworkJobTitle,
      coverLetter: args.coverLetter,
      videoLink: args.videoLink,
      status: "sent",
      sentAt,
      boosted: args.boosted,
    });
  },
});

/**
 * Update a proposal's funnel status (e.g. when we learn from Upwork that it was viewed).
 */
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

const discoveredJobItemValidator = v.object({
  upworkJobId: v.string(),
  title: v.string(),
  description: v.optional(v.string()),
  budgetInfo: v.optional(v.string()),
  postedAt: v.optional(v.number()),
});

/**
 * Discover jobs from Upwork (e.g. in niche, >$5K).
 * TODO: Implement Upwork GraphQL job search (https://developer.upwork.com/) and
 * persist results via addDiscoveredJob. For now returns empty list.
 */
export const discoverJobs = action({
  args: {
    minBudget: v.optional(v.number()),
    keyword: v.optional(v.string()),
  },
  returns: v.array(discoveredJobItemValidator),
  handler: async (_ctx, _args) => {
    // Placeholder: real implementation will use Upwork GraphQL API with user's tokens
    return [];
  },
});

/**
 * Mark a discovered job as applied and link to the proposal.
 */
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

/**
 * Add a discovered job to the list (manual add or from future job discovery action).
 */
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

const MANUAL_REFRESH_DAILY_CAP = 3;

function getTodayUtcDateString(): string {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

/**
 * Status for manual refresh cap and "Last updated at" display.
 */
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

/**
 * Request a manual discovery run (Refresh jobs). Enforces daily cap.
 */
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

/**
 * Internal: record a discovery run for "Last updated at".
 */
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

/**
 * Internal: add a discovered job for a specific user (used by scheduled/manual discovery).
 */
export const addDiscoveredJobForUser = internalMutation({
  args: {
    userId: v.id("users"),
    upworkJobId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    budgetInfo: v.optional(v.string()),
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
      postedAt: args.postedAt,
      applied: false,
    });
  },
});

const UPWORK_GRAPHQL_URL = "https://api.upwork.com/graphql";
const UPWORK_TOKEN_URL = "https://www.upwork.com/api/v3/oauth2/token";

const UPWORK_JOBS_QUERY = `
query DiscoverJobs($filter: MarketplaceJobPostingsSearchFilter, $searchType: MarketplaceJobPostingSearchType, $sort: [MarketplaceJobPostingSearchSortAttribute]) {
  marketplaceJobPostingsSearch(
    marketPlaceJobFilter: $filter
    searchType: $searchType
    sortAttributes: $sort
  ) {
    totalCount
    edges {
      node {
        id
        title
        description
        ciphertext
        createdDateTime
        amount { rawValue currency displayValue }
        duration
        durationLabel
        client {
          totalHires
          totalSpent { displayValue }
          verificationStatus
          totalFeedback
        }
        skills { prettyName }
      }
    }
  }
}
`;

export const getUpworkCredentials = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(
    v.object({
      accessToken: v.string(),
      refreshToken: v.string(),
      expiresAt: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const creds = await ctx.db
      .query("upworkCredentials")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
    if (!creds) return null;
    return {
      accessToken: creds.accessToken,
      refreshToken: creds.refreshToken,
      expiresAt: creds.expiresAt,
    };
  },
});

export const updateUpworkTokens = internalMutation({
  args: {
    userId: v.id("users"),
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("upworkCredentials")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
    if (!existing) {
      console.error(
        "[Upwork Discovery] No credentials row to update for user",
        args.userId,
      );
      return null;
    }
    await ctx.db.patch(existing._id, {
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      expiresAt: args.expiresAt,
    });
    return null;
  },
});

/**
 * Internal: run discovery for one user (scheduled or after manual request).
 */
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

    const creds = await ctx.runQuery(internal.upwork.getUpworkCredentials, {
      userId: args.userId,
    });
    if (!creds) {
      console.error(
        "[Upwork Discovery] No credentials found for user",
        args.userId,
      );
      return null;
    }

    let { accessToken } = creds;
    const TOKEN_EXPIRY_BUFFER_MS = 60_000;

    if (creds.expiresAt < Date.now() + TOKEN_EXPIRY_BUFFER_MS) {
      console.log("[Upwork Discovery] Access token expired, refreshing…");
      const clientId = process.env.UPWORK_CLIENT_ID;
      const clientSecret = process.env.UPWORK_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        console.error(
          "[Upwork Discovery] Cannot refresh token: UPWORK_CLIENT_ID or UPWORK_CLIENT_SECRET missing",
        );
        return null;
      }

      const refreshRes = await fetch(UPWORK_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: creds.refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
        }).toString(),
      });

      if (!refreshRes.ok) {
        const body = await refreshRes.text();
        console.error(
          "[Upwork Discovery] Token refresh failed:",
          refreshRes.status,
          body,
        );
        return null;
      }

      const tokenData = (await refreshRes.json()) as {
        access_token: string;
        refresh_token: string;
        expires_in: number;
      };

      accessToken = tokenData.access_token;
      const newExpiresAt = Date.now() + tokenData.expires_in * 1000;

      await ctx.runMutation(internal.upwork.updateUpworkTokens, {
        userId: args.userId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: newExpiresAt,
      });
      console.log("[Upwork Discovery] Token refreshed successfully");
    }

    const graphqlRes = await fetch(UPWORK_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        query: UPWORK_JOBS_QUERY,
        variables: {
          filter: {
            pagination_eq: { after: "0", first: 30 },
          },
          searchType: "USER_JOBS_SEARCH",
          sort: [{ field: "RECENCY" }],
        },
      }),
    });

    if (!graphqlRes.ok) {
      const body = await graphqlRes.text();
      console.error(
        "[Upwork Discovery] GraphQL request failed:",
        graphqlRes.status,
        body,
      );
      return null;
    }

    const gqlBody = (await graphqlRes.json()) as {
      data?: {
        marketplaceJobPostingsSearch?: {
          totalCount?: number;
          edges?: Array<{
            node: {
              id: string;
              title: string;
              description: string;
              ciphertext: string;
              createdDateTime: string;
              amount?: { rawValue?: string; currency?: string; displayValue?: string };
              duration?: string;
              durationLabel?: string;
              client?: {
                totalHires?: number;
                totalSpent?: { displayValue?: string };
                verificationStatus?: string;
                totalFeedback?: number;
              };
              skills?: Array<{ prettyName: string }>;
            };
          }>;
        };
      };
      errors?: Array<{ message: string }>;
    };

    if (gqlBody.errors && gqlBody.errors.length > 0) {
      console.error(
        "[Upwork Discovery] GraphQL errors:",
        JSON.stringify(gqlBody.errors),
      );
      return null;
    }

    const edges =
      gqlBody.data?.marketplaceJobPostingsSearch?.edges ?? [];
    const totalCount =
      gqlBody.data?.marketplaceJobPostingsSearch?.totalCount ?? 0;
    console.log(
      `[Upwork Discovery] Fetched ${edges.length} jobs (totalCount: ${totalCount}) for user ${args.userId}`,
    );

    for (const edge of edges) {
      const node = edge.node;

      let budgetInfo: string | undefined;
      if (node.amount?.displayValue) {
        budgetInfo = node.amount.displayValue;
      }
      if (node.durationLabel) {
        budgetInfo = budgetInfo
          ? `${budgetInfo} · ${node.durationLabel}`
          : node.durationLabel;
      }

      let postedAt: number | undefined;
      if (node.createdDateTime) {
        const parsed = Date.parse(node.createdDateTime);
        if (!isNaN(parsed)) postedAt = parsed;
      }

      const description = node.description
        ? node.description.slice(0, 2000)
        : undefined;

      await ctx.runMutation(internal.upwork.addDiscoveredJobForUser, {
        userId: args.userId,
        upworkJobId: node.ciphertext || node.id,
        title: node.title,
        description,
        budgetInfo,
        postedAt,
      });
    }

    return null;
  },
});

/**
 * Internal: run scheduled discovery for all users with Upwork credentials.
 * Called by cron 1-2 times per day.
 */
export const runScheduledDiscovery = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const creds = await ctx.db.query("upworkCredentials").collect();
    const userIds = [...new Set(creds.map((c) => c.userId))];
    for (const userId of userIds) {
      await ctx.scheduler.runAfter(0, internal.upwork.runDiscoveryForUser, {
        userId,
        source: "cron" as const,
      });
    }
    return null;
  },
});
