import { authTables } from "@convex-dev/auth/server";
import { defineSchema } from "convex/server";
import { adminInvites } from "./table/adminInvites";
import { autoApplySettings } from "./table/autoApplySettings";
import { discoveredJobs } from "./table/discoveredJobs";
import { discoveryRefreshLog } from "./table/discoveryRefreshLog";
import { discoveryRuns } from "./table/discoveryRuns";
import { feedback } from "./table/feedback";
import { pendingApplications } from "./table/pendingApplications";
import { proposals } from "./table/proposals";
import { users } from "./table/users";

export default defineSchema({
  ...authTables,
  adminInvites,
  autoApplySettings,
  discoveredJobs,
  discoveryRefreshLog,
  discoveryRuns,
  feedback,
  pendingApplications,
  proposals,
  users,
});
