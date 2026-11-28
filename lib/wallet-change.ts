import type { CacheResource } from "@/lib/cache";
import type { QueryKey } from "@tanstack/react-query";

import { z } from "zod";

import { queryKeyPrefixes, queryKeys } from "@/lib/query-keys";

export const WALLET_EVENT_CHANNEL = "sora_wallet_events";
export const WALLET_EVENTS_ENDPOINT = "/api/events";

export const WALLET_CHANGE_RESOURCES = [
  "transactions",
  "settlements",
  "budgets",
  "goals",
  "categories",
  "recurring",
  "members",
  "wallet",
  "notifications",
  "invites",
] as const;

export type WalletChangeResource = (typeof WALLET_CHANGE_RESOURCES)[number];

export const WALLET_CHANGE_SCOPES = [
  "category-renamed",
  "category-icon-changed",
  "member-joined",
] as const;

export type WalletChangeScope = (typeof WALLET_CHANGE_SCOPES)[number];

export const walletChangeSchema = z.object({
  walletId: z.string().min(1),
  actorId: z.string(),
  resource: z.enum(WALLET_CHANGE_RESOURCES),
  message: z.string().min(1),
  at: z.string(),
  recipientId: z.string().optional(),
  scope: z.enum(WALLET_CHANGE_SCOPES).optional(),
});

export type WalletChange = z.infer<typeof walletChangeSchema>;

export type WalletChangeEffects = {
  serverTags: readonly CacheResource[];
  clientKeys: readonly QueryKey[];
};

const EFFECTS: Record<WalletChangeResource, WalletChangeEffects> = {
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
      queryKeyPrefixes.transactions,
      queryKeyPrefixes.overview,
      queryKeyPrefixes.balances,
      queryKeyPrefixes.budgets,
      queryKeyPrefixes.goals,
      queryKeyPrefixes.insights,
      queryKeyPrefixes.sharedSpending,
      queryKeyPrefixes.simplifiedDebts,
    ],
  },
  settlements: {
    serverTags: ["balances", "settlements", "transactions"],
    clientKeys: [
      queryKeyPrefixes.balances,
      queryKeyPrefixes.settlements,
      queryKeyPrefixes.simplifiedDebts,
    ],
  },
  budgets: {
    serverTags: ["budgets"],
    clientKeys: [
      queryKeyPrefixes.budgets,
      queryKeyPrefixes.sharedSpending,
      queryKeyPrefixes.insights,
    ],
  },
  goals: {
    serverTags: ["goals"],
    clientKeys: [queryKeyPrefixes.goals, queryKeyPrefixes.overview],
  },
  categories: {
    serverTags: ["categories"],
    clientKeys: [
      queryKeyPrefixes.categories,
      queryKeyPrefixes.transactions,
      queryKeyPrefixes.overview,
      queryKeyPrefixes.recurringItems,
    ],
  },
  recurring: {
    serverTags: ["recurring"],
    clientKeys: [queryKeyPrefixes.recurringItems, queryKeyPrefixes.overview],
  },
  members: {
    serverTags: ["members", "wallet", "balances"],
    clientKeys: [
      queryKeyPrefixes.walletMembers,
      queryKeyPrefixes.formerMembers,
      queryKeys.wallets,
      queryKeyPrefixes.balances,
      queryKeyPrefixes.simplifiedDebts,
    ],
  },
  wallet: {
    serverTags: ["wallet"],
    clientKeys: [queryKeyPrefixes.wallet, queryKeys.wallets],
  },
  notifications: {
    serverTags: ["notifications"],
    clientKeys: [queryKeyPrefixes.notifications],
  },
  invites: {
    serverTags: ["invites"],
    clientKeys: [queryKeyPrefixes.inviteLinks],
  },
};

const SCOPED_EFFECTS: Record<WalletChangeScope, WalletChangeEffects> = {
  "category-renamed": {
    serverTags: ["categories", "transactions", "budgets", "recurring"],
    clientKeys: [...EFFECTS.categories.clientKeys, queryKeyPrefixes.budgets],
  },
  "category-icon-changed": {
    serverTags: [...EFFECTS.categories.serverTags, "transactions", "recurring"],
    clientKeys: EFFECTS.categories.clientKeys,
  },
  "member-joined": {
    serverTags: ["members", "wallet", "balances"],
    clientKeys: EFFECTS.members.clientKeys,
  },
};

export function walletChangeEffects(
  resource: WalletChangeResource,
  scope?: WalletChangeScope,
): WalletChangeEffects {
  return scope ? SCOPED_EFFECTS[scope] : EFFECTS[resource];
}
