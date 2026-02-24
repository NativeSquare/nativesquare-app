/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as analytics from "../analytics.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as emails from "../emails.js";
import type * as http from "../http.js";
import type * as lib_auth_ResendOTP from "../lib/auth/ResendOTP.js";
import type * as lib_auth_ResendOTPPasswordReset from "../lib/auth/ResendOTPPasswordReset.js";
import type * as migrations from "../migrations.js";
import type * as storage from "../storage.js";
import type * as table_admin from "../table/admin.js";
import type * as table_adminInvites from "../table/adminInvites.js";
import type * as table_discoveredJobs from "../table/discoveredJobs.js";
import type * as table_discoveryRefreshLog from "../table/discoveryRefreshLog.js";
import type * as table_discoveryRuns from "../table/discoveryRuns.js";
import type * as table_feedback from "../table/feedback.js";
import type * as table_proposalSnapshots from "../table/proposalSnapshots.js";
import type * as table_users from "../table/users.js";
import type * as upwork from "../upwork.js";
import type * as utils_generateFunctions from "../utils/generateFunctions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  analytics: typeof analytics;
  auth: typeof auth;
  crons: typeof crons;
  emails: typeof emails;
  http: typeof http;
  "lib/auth/ResendOTP": typeof lib_auth_ResendOTP;
  "lib/auth/ResendOTPPasswordReset": typeof lib_auth_ResendOTPPasswordReset;
  migrations: typeof migrations;
  storage: typeof storage;
  "table/admin": typeof table_admin;
  "table/adminInvites": typeof table_adminInvites;
  "table/discoveredJobs": typeof table_discoveredJobs;
  "table/discoveryRefreshLog": typeof table_discoveryRefreshLog;
  "table/discoveryRuns": typeof table_discoveryRuns;
  "table/feedback": typeof table_feedback;
  "table/proposalSnapshots": typeof table_proposalSnapshots;
  "table/users": typeof table_users;
  upwork: typeof upwork;
  "utils/generateFunctions": typeof utils_generateFunctions;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  migrations: {
    lib: {
      cancel: FunctionReference<
        "mutation",
        "internal",
        { name: string },
        {
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }
      >;
      cancelAll: FunctionReference<
        "mutation",
        "internal",
        { sinceTs?: number },
        Array<{
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }>
      >;
      clearAll: FunctionReference<
        "mutation",
        "internal",
        { before?: number },
        null
      >;
      getStatus: FunctionReference<
        "query",
        "internal",
        { limit?: number; names?: Array<string> },
        Array<{
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }>
      >;
      migrate: FunctionReference<
        "mutation",
        "internal",
        {
          batchSize?: number;
          cursor?: string | null;
          dryRun: boolean;
          fnHandle: string;
          name: string;
          next?: Array<{ fnHandle: string; name: string }>;
          oneBatchOnly?: boolean;
        },
        {
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }
      >;
    };
  };
  resend: {
    lib: {
      cancelEmail: FunctionReference<
        "mutation",
        "internal",
        { emailId: string },
        null
      >;
      cleanupAbandonedEmails: FunctionReference<
        "mutation",
        "internal",
        { olderThan?: number },
        null
      >;
      cleanupOldEmails: FunctionReference<
        "mutation",
        "internal",
        { olderThan?: number },
        null
      >;
      createManualEmail: FunctionReference<
        "mutation",
        "internal",
        {
          from: string;
          headers?: Array<{ name: string; value: string }>;
          replyTo?: Array<string>;
          subject: string;
          to: Array<string> | string;
        },
        string
      >;
      get: FunctionReference<
        "query",
        "internal",
        { emailId: string },
        {
          bcc?: Array<string>;
          bounced?: boolean;
          cc?: Array<string>;
          clicked?: boolean;
          complained: boolean;
          createdAt: number;
          deliveryDelayed?: boolean;
          errorMessage?: string;
          failed?: boolean;
          finalizedAt: number;
          from: string;
          headers?: Array<{ name: string; value: string }>;
          html?: string;
          opened: boolean;
          replyTo: Array<string>;
          resendId?: string;
          segment: number;
          status:
            | "waiting"
            | "queued"
            | "cancelled"
            | "sent"
            | "delivered"
            | "delivery_delayed"
            | "bounced"
            | "failed";
          subject?: string;
          template?: {
            id: string;
            variables?: Record<string, string | number>;
          };
          text?: string;
          to: Array<string>;
        } | null
      >;
      getStatus: FunctionReference<
        "query",
        "internal",
        { emailId: string },
        {
          bounced: boolean;
          clicked: boolean;
          complained: boolean;
          deliveryDelayed: boolean;
          errorMessage: string | null;
          failed: boolean;
          opened: boolean;
          status:
            | "waiting"
            | "queued"
            | "cancelled"
            | "sent"
            | "delivered"
            | "delivery_delayed"
            | "bounced"
            | "failed";
        } | null
      >;
      handleEmailEvent: FunctionReference<
        "mutation",
        "internal",
        { event: any },
        null
      >;
      sendEmail: FunctionReference<
        "mutation",
        "internal",
        {
          bcc?: Array<string>;
          cc?: Array<string>;
          from: string;
          headers?: Array<{ name: string; value: string }>;
          html?: string;
          options: {
            apiKey: string;
            initialBackoffMs: number;
            onEmailEvent?: { fnHandle: string };
            retryAttempts: number;
            testMode: boolean;
          };
          replyTo?: Array<string>;
          subject?: string;
          template?: {
            id: string;
            variables?: Record<string, string | number>;
          };
          text?: string;
          to: Array<string>;
        },
        string
      >;
      updateManualEmail: FunctionReference<
        "mutation",
        "internal",
        {
          emailId: string;
          errorMessage?: string;
          resendId?: string;
          status:
            | "waiting"
            | "queued"
            | "cancelled"
            | "sent"
            | "delivered"
            | "delivery_delayed"
            | "bounced"
            | "failed";
        },
        null
      >;
    };
  };
  upwork: {
    private: {
      getTokens: FunctionReference<
        "query",
        "internal",
        {},
        {
          _creationTime: number;
          _id: string;
          accessToken: string;
          expiresAt: number;
          refreshToken: string;
          tokenType: string;
        } | null
      >;
      storeTokens: FunctionReference<
        "mutation",
        "internal",
        {
          accessToken: string;
          expiresAt: number;
          refreshToken: string;
          tokenType: string;
        },
        null
      >;
      upsertJobPostings: FunctionReference<
        "mutation",
        "internal",
        {
          postings: Array<{
            budgetAmount?: string;
            budgetCurrency?: string;
            category?: string;
            clientCompanyName?: string;
            clientTotalHires?: number;
            createdDateTime: string;
            description: string;
            duration?: string;
            experienceLevel: string;
            publishedDateTime: string;
            skills: Array<{ name: string }>;
            subcategory?: string;
            title: string;
            upworkId: string;
          }>;
        },
        null
      >;
    };
    public: {
      exchangeAuthCode: FunctionReference<
        "action",
        "internal",
        {
          clientId: string;
          clientSecret: string;
          code: string;
          redirectUri: string;
        },
        any
      >;
      fetchJobPosting: FunctionReference<
        "action",
        "internal",
        { clientId: string; clientSecret: string; upworkId: string },
        any
      >;
      fetchProposal: FunctionReference<
        "action",
        "internal",
        { clientId: string; clientSecret: string; proposalId: string },
        any
      >;
      fetchProposals: FunctionReference<
        "action",
        "internal",
        {
          clientId: string;
          clientSecret: string;
          filter: any;
          pagination: { after: string | null; first: number };
          sortAttribute: any;
        },
        any
      >;
      getAuthStatus: FunctionReference<"query", "internal", {}, any>;
      getJobPosting: FunctionReference<
        "query",
        "internal",
        { upworkId: string },
        any
      >;
      listJobPostings: FunctionReference<
        "query",
        "internal",
        { limit?: number },
        any
      >;
      refreshAccessToken: FunctionReference<
        "action",
        "internal",
        { clientId: string; clientSecret: string },
        any
      >;
      searchJobPostings: FunctionReference<
        "action",
        "internal",
        {
          clientId: string;
          clientSecret: string;
          marketPlaceJobFilter?: {
            area_eq?: { latitude: number; longitude: number; radius: number };
            budgetRange_eq?: { rangeEnd?: number; rangeStart?: number };
            categoryIds_any?: Array<string>;
            clientHiresRange_eq?: { rangeEnd?: number; rangeStart?: number };
            enterpriseOnly_eq?: boolean;
            experienceLevel_eq?: "ENTRY_LEVEL" | "EXPERT" | "INTERMEDIATE";
            hourlyRate_eq?: { rangeEnd?: number; rangeStart?: number };
            jobType_eq?: "FIXED" | "HOURLY";
            locations_any?: Array<string>;
            occupationIds_any?: Array<string>;
            ontologySkillIds_all?: Array<string>;
            pagination_eq?: { after?: string; first: number };
            preserveFacet_eq?: string;
            previousClients_eq?: boolean;
            proposalRange_eq?: { rangeEnd?: number; rangeStart?: number };
            ptcIds_any?: Array<string>;
            ptcOnly_eq?: boolean;
            searchExpression_eq?: string;
            searchTerm_eq?: {
              andTerms_all?: Array<string>;
              exactTerms_any?: Array<string>;
              excludeTerms_any?: Array<string>;
              orTerms_any?: Array<string>;
            };
            skillExpression_eq?: string;
            subcategoryIds_any?: Array<string>;
            timezone_eq?: string;
            titleExpression_eq?: string;
            userLocationMatch_eq?: boolean;
            verifiedPaymentOnly_eq?: boolean;
            visitorCountry_eq?: string;
            workload_eq?: "AS_NEEDED" | "FULL_TIME" | "NOT_SURE" | "PART_TIME";
          };
          sortAttributes?: Array<
            "CLIENT_RATING" | "CLIENT_TOTAL_CHARGE" | "RECENCY" | "RELEVANCE"
          >;
        },
        any
      >;
    };
  };
};
