import { revalidateTag } from "next/cache";

export const CACHE_RESOURCE = {
  transactions: "transactions",
  balances: "balances",
  settlements: "settlements",
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
  wallet: "wallet",
} as const;

export type CacheResource =
  (typeof CACHE_RESOURCE)[keyof typeof CACHE_RESOURCE];

export function walletTag(walletId: string, resource: CacheResource) {
  return `wallet:${walletId}:${resource}`;
}

export function memberWalletsTag(userId: string) {
  return `member:${userId}:wallets`;
}

export function revalidateMemberWallets(userId: string) {
  revalidateTag(memberWalletsTag(userId), { expire: 0 });
}

export function revalidateWallet(
  walletId: string,
  resources: readonly CacheResource[],
) {
  for (const resource of resources) {
    revalidateTag(walletTag(walletId, resource), { expire: 0 });
  }
}
