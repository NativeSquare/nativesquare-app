import { authTables } from "@convex-dev/auth/server";
import { defineSchema } from "convex/server";
import { adminInvites } from "./table/adminInvites";
import { discoveredJobs } from "./table/discoveredJobs";
import { discoveryRefreshLog } from "./table/discoveryRefreshLog";
import { discoveryRuns } from "./table/discoveryRuns";
import { feedback } from "./table/feedback";
import { proposalSnapshots } from "./table/proposalSnapshots";
import { users } from "./table/users";

export default defineSchema({
  ...authTables,
  adminInvites,
  discoveredJobs,
  discoveryRefreshLog,
  discoveryRuns,
  feedback,
  proposalSnapshots,
  users,
});
