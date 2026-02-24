import { Upwork } from "@nativesquare/upwork";
import type { VendorProposal } from "@nativesquare/upwork";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";

const upwork = new Upwork(components.upwork);

// ---------------------------------------------------------------------------
// Proposal status categorization
// ---------------------------------------------------------------------------

/**
 * Returns true if the proposal has been viewed by the client.
 * Any internal state beyond the initial submission counts as "seen".
 */
function isSeen(proposal: VendorProposal): boolean {
  const state = proposal.status?.internalState?.toLowerCase() ?? "";
  // Everything except the initial submitted state counts as seen
  return state !== "" && state !== "submitted" && state !== "pending";
}

/**
 * Returns true if the client has sent a message / started interviewing.
 */
function hasMessage(proposal: VendorProposal): boolean {
  const state = proposal.status?.internalState?.toLowerCase() ?? "";
  return state === "interviewing" || state === "messaged";
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getProposalSnapshots = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return [];
    }
    return await ctx.db
      .query("proposalSnapshots")
      .withIndex("by_user_and_date", (q) => q.eq("userId", userId))
      .order("asc")
      .collect();
  },
});

// ---------------------------------------------------------------------------
// Internal: upsert a snapshot row
// ---------------------------------------------------------------------------

export const upsertProposalSnapshot = internalMutation({
  args: {
    userId: v.id("users"),
    date: v.string(),
    sent: v.number(),
    seen: v.number(),
    messageReceived: v.number(),
    clientSigned: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("proposalSnapshots")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", args.userId).eq("date", args.date),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        sent: args.sent,
        seen: args.seen,
        messageReceived: args.messageReceived,
        clientSigned: args.clientSigned,
      });
    } else {
      await ctx.db.insert("proposalSnapshots", {
        userId: args.userId,
        date: args.date,
        sent: args.sent,
        seen: args.seen,
        messageReceived: args.messageReceived,
        clientSigned: args.clientSigned,
      });
    }
    return null;
  },
});

// ---------------------------------------------------------------------------
// Internal: fetch proposals from Upwork and store a daily snapshot
// ---------------------------------------------------------------------------

export const fetchAndStoreProposalSnapshot = internalAction({
  args: {
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Fetch all proposals (paginate through all pages)
    const allProposals: VendorProposal[] = [];
    let cursor: string | null = null;
    let hasMore = true;

    while (hasMore) {
      let result;
      try {
        result = await upwork.fetchProposals(ctx, {
          filter: {},
          sortAttribute: {},
          pagination: { after: cursor, first: 50 },
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        console.error("[Analytics] Failed to fetch proposals:", message);
        return null;
      }

      allProposals.push(...result.proposals);
      hasMore = result.pageInfo.hasNextPage;
      cursor = result.pageInfo.endCursor;
    }

    // Compute cumulative counts
    const sent = allProposals.length;
    const seen = allProposals.filter(isSeen).length;
    const messageReceived = allProposals.filter(hasMessage).length;

    // Preserve the manual clientSigned count from the latest snapshot
    const today = new Date().toISOString().slice(0, 10);
    const latestSnapshots = await ctx.runQuery(
      internal.analytics.getLatestClientSignedCount,
      { userId: args.userId },
    );
    const clientSigned = latestSnapshots ?? 0;

    await ctx.runMutation(internal.analytics.upsertProposalSnapshot, {
      userId: args.userId,
      date: today,
      sent,
      seen,
      messageReceived,
      clientSigned,
    });

    console.log(
      `[Analytics] Snapshot for ${today}: sent=${sent}, seen=${seen}, messageReceived=${messageReceived}, clientSigned=${clientSigned}`,
    );
    return null;
  },
});

// ---------------------------------------------------------------------------
// Internal: helper to get latest clientSigned count (preserves manual input)
// ---------------------------------------------------------------------------

export const getLatestClientSignedCount = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const latest = await ctx.db
      .query("proposalSnapshots")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .first();
    return latest?.clientSigned ?? 0;
  },
});

// ---------------------------------------------------------------------------
// Internal: scheduled snapshot for all active users
// ---------------------------------------------------------------------------

export const runScheduledProposalSnapshots = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Find all users who have run discovery (same as upwork scheduled discovery)
    const allRuns = await ctx.db.query("discoveryRuns").collect();
    const userIds = [...new Set(allRuns.map((r) => r.userId))];
    for (const userId of userIds) {
      await ctx.scheduler.runAfter(
        0,
        internal.analytics.fetchAndStoreProposalSnapshot,
        { userId },
      );
    }
    return null;
  },
});
