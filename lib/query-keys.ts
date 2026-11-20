import type { Period, Timeframe } from "@/lib/types";
import type { QueryKey } from "@tanstack/react-query";

export const queryKeys = {
  apiTokens: ["apiTokens"] satisfies QueryKey,
  balances: ["balances"] satisfies QueryKey,
  budgets: ["budgets"] satisfies QueryKey,
  categories: (type?: string | null): QueryKey =>
    type ? ["categories", type] : ["categories"],
  goals: ["goals"] satisfies QueryKey,
  household: ["household"] satisfies QueryKey,
  householdMembers: ["householdMembers"] satisfies QueryKey,
  households: ["households"] satisfies QueryKey,
  insights: ["insights"] satisfies QueryKey,
  inviteLinks: ["inviteLinks"] satisfies QueryKey,
  memberCount: ["memberCount"] satisfies QueryKey,
  notifications: ["notifications"] satisfies QueryKey,
  overview: {
    all: ["overview"] satisfies QueryKey,
    stats: (from: Date, to: Date): QueryKey => ["overview", "stats", from, to],
    categories: (from: Date, to: Date): QueryKey => [
      "overview",
      "stats",
      "categories",
      from,
      to,
    ],
    history: (timeframe: Timeframe, period: Period): QueryKey => [
      "overview",
      "history",
      timeframe,
      period,
    ],
  },
  recurringItems: ["recurringItems"] satisfies QueryKey,
  sharedSpending: ["shared-spending"] satisfies QueryKey,
  simplifiedDebts: ["simplified-debts"] satisfies QueryKey,
  transactions: {
    all: ["transactions"] satisfies QueryKey,
    history: (from: Date, to: Date, pageSize: number): QueryKey => [
      "transactions",
      "history",
      from,
      to,
      pageSize,
    ],
  },
};
