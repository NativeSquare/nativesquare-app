import { Migrations } from "@convex-dev/migrations";
import { components } from "./_generated/api.js";
import { DataModel } from "./_generated/dataModel.js";

export const migrations = new Migrations<DataModel>(components.migrations);
export const runAll = migrations.runner();

export const stripDiscoveredJobsCachedFields = migrations.define({
  table: "discoveredJobs",
  migrateOne: async (ctx, doc) => {
    const raw = doc as Record<string, unknown>;
    const fieldsToRemove = [
      "title",
      "description",
      "budgetInfo",
      "budgetAmount",
      "budgetCurrency",
      "clientTotalHires",
      "clientCompanyName",
    ] as const;
    const hasAny = fieldsToRemove.some((f) => raw[f] !== undefined);
    if (hasAny) {
      await ctx.db.patch(doc._id, {
        title: undefined,
        description: undefined,
        budgetInfo: undefined,
        budgetAmount: undefined,
        budgetCurrency: undefined,
        clientTotalHires: undefined,
        clientCompanyName: undefined,
      } as Record<string, undefined>);
    }
  },
});
