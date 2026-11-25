import type { CacheResource } from "@/lib/cache";
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

export type HouseholdChangeResource =
  (typeof HOUSEHOLD_CHANGE_RESOURCES)[number];

export const householdChangeSchema = z.object({
  householdId: z.string().min(1),
  actorId: z.string(),
  resource: z.enum(HOUSEHOLD_CHANGE_RESOURCES),
  message: z.string().min(1),
  at: z.string(),
});

export type HouseholdChange = z.infer<typeof householdChangeSchema>;

export const eventSourceReadySchema = z.object({
  viewerId: z.string(),
});

export type HouseholdChangeEffects = {
  serverTags: readonly CacheResource[];
  clientKeys: readonly QueryKey[];
};

const EFFECTS: Record<HouseholdChangeResource, HouseholdChangeEffects> = {
  transactions: {
    serverTags: [
      "transactions",
      "balances",
      "budgets",
      "goals",
      "insights",
      "history",
    ],
    clientKeys: [
      queryKeys.transactions.all,
      queryKeys.overview.all,
      queryKeys.balances,
      queryKeys.budgets,
      queryKeys.goals,
      queryKeys.insights,
      queryKeys.sharedSpending,
      queryKeys.simplifiedDebts,
    ],
  },
  budgets: {
    serverTags: ["budgets"],
    clientKeys: [
      queryKeys.budgets,
      queryKeys.sharedSpending,
      queryKeys.insights,
    ],
  },
  goals: {
    serverTags: ["goals"],
    clientKeys: [queryKeys.goals, queryKeys.overview.all],
  },
  categories: {
    serverTags: ["categories"],
    clientKeys: [
      queryKeys.categories(),
      queryKeys.transactions.all,
      queryKeys.overview.all,
      queryKeys.recurringItems,
    ],
  },
  recurring: {
    serverTags: ["recurring"],
    clientKeys: [queryKeys.recurringItems, queryKeys.overview.all],
  },
  members: {
    serverTags: ["members"],
    clientKeys: [
      queryKeys.householdMembers,
      queryKeys.households,
      queryKeys.balances,
      queryKeys.simplifiedDebts,
    ],
  },
  household: {
    serverTags: ["household"],
    clientKeys: [queryKeys.household, queryKeys.households],
  },
  notifications: {
    serverTags: ["notifications"],
    clientKeys: [queryKeys.notifications],
  },
};

export function householdChangeEffects(
  resource: HouseholdChangeResource,
): HouseholdChangeEffects {
  return EFFECTS[resource];
}
