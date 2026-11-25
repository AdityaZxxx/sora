import { revalidateTag } from "next/cache";

export const CACHE_RESOURCE = {
  transactions: "transactions",
  balances: "balances",
  budgets: "budgets",
  goals: "goals",
  insights: "insights",
  history: "history",
  categories: "categories",
  recurring: "recurring",
  members: "members",
  notifications: "notifications",
  invites: "invites",
  apiTokens: "api-tokens",
  household: "household",
} as const;

export type CacheResource =
  (typeof CACHE_RESOURCE)[keyof typeof CACHE_RESOURCE];

export function householdTag(householdId: string, resource: CacheResource) {
  return `household:${householdId}:${resource}`;
}

export function memberHouseholdsTag(userId: string) {
  return `member:${userId}:households`;
}

export function revalidateMemberHouseholds(userId: string) {
  revalidateTag(memberHouseholdsTag(userId), { expire: 0 });
}

export function revalidateHousehold(
  householdId: string,
  resources: readonly CacheResource[],
) {
  for (const resource of resources) {
    revalidateTag(householdTag(householdId, resource), { expire: 0 });
  }
}
