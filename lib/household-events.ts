import type { QueryKey } from "@tanstack/react-query";

import { z } from "zod";

import { queryKeys } from "@/lib/query-keys";

export const HOUSEHOLD_EVENT_CHANNEL = "sora_household_events";
export const HOUSEHOLD_EVENTS_ENDPOINT = "/api/events";

export const HOUSEHOLD_CHANGE_RESOURCES = [
  "transactions",
  "budgets",
  "goals",
  "categories",
  "recurring",
  "members",
  "household",
  "notifications",
] as const;

export const householdChangeSchema = z.object({
  householdId: z.string().min(1),
  actorId: z.string(),
  resource: z.enum(HOUSEHOLD_CHANGE_RESOURCES),
  message: z.string().min(1),
  at: z.string(),
});

export type HouseholdChange = z.infer<typeof householdChangeSchema>;
export type HouseholdChangeResource = HouseholdChange["resource"];

export const eventSourceReadySchema = z.object({
  viewerId: z.string(),
});

export function queryKeysForChange(resource: HouseholdChangeResource) {
  const keys: QueryKey[] = [];
  switch (resource) {
    case "notifications":
      return [queryKeys.notifications];
    case "transactions":
      keys.push(
        queryKeys.transactions.all,
        queryKeys.overview.all,
        queryKeys.balances,
        queryKeys.budgets,
        queryKeys.goals,
        queryKeys.insights,
        queryKeys.sharedSpending,
        queryKeys.simplifiedDebts,
      );
      break;
    case "budgets":
      keys.push(
        queryKeys.budgets,
        queryKeys.sharedSpending,
        queryKeys.insights,
      );
      break;
    case "goals":
      keys.push(queryKeys.goals, queryKeys.overview.all);
      break;
    case "categories":
      keys.push(
        queryKeys.categories(),
        queryKeys.transactions.all,
        queryKeys.overview.all,
        queryKeys.recurringItems,
      );
      break;
    case "recurring":
      keys.push(queryKeys.recurringItems, queryKeys.overview.all);
      break;
    case "members":
      keys.push(
        queryKeys.householdMembers,
        queryKeys.memberCount,
        queryKeys.households,
        queryKeys.balances,
        queryKeys.simplifiedDebts,
      );
      break;
    case "household":
      keys.push(
        queryKeys.household,
        queryKeys.households,
        queryKeys.memberCount,
      );
      break;
  }
  return keys;
}
