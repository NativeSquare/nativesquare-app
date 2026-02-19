import { authTables } from "@convex-dev/auth/server";
import { defineSchema } from "convex/server";
import { adminInvites } from "./table/adminInvites";
import { discoveredJobs } from "./table/discoveredJobs";
import { discoveryRefreshLog } from "./table/discoveryRefreshLog";
import { discoveryRuns } from "./table/discoveryRuns";
import { feedback } from "./table/feedback";
import { proposals } from "./table/proposals";
import { upworkCredentials } from "./table/upworkCredentials";
import { upworkOAuthState } from "./table/upworkOAuthState";
import { users } from "./table/users";

export default defineSchema({
  ...authTables,
  adminInvites,
  discoveredJobs,
  discoveryRefreshLog,
  discoveryRuns,
  feedback,
  proposals,
  upworkCredentials,
  upworkOAuthState,
  users,
});
