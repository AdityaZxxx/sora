import type { CacheResource } from "@/lib/cache";
import type { QueryKey } from "@tanstack/react-query";

import { z } from "zod";

import { queryKeys } from "@/lib/query-keys";

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
  settlements: {
    serverTags: ["balances", "settlements", "transactions"],
    clientKeys: [
      queryKeys.balances,
      queryKeys.settlements,
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
    serverTags: ["members", "wallet", "balances"],
    clientKeys: [
      queryKeys.walletMembers,
      queryKeys.formerMembers,
      queryKeys.wallets,
      queryKeys.balances,
      queryKeys.simplifiedDebts,
    ],
  },
  wallet: {
    serverTags: ["wallet"],
    clientKeys: [queryKeys.wallet, queryKeys.wallets],
  },
  notifications: {
    serverTags: ["notifications"],
    clientKeys: [queryKeys.notifications],
  },
  invites: {
    serverTags: ["invites"],
    clientKeys: [queryKeys.inviteLinks],
  },
};

const SCOPED_EFFECTS: Record<WalletChangeScope, WalletChangeEffects> = {
  "category-renamed": {
    serverTags: ["categories", "transactions", "budgets", "recurring"],
    clientKeys: [...EFFECTS.categories.clientKeys, queryKeys.budgets],
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
