import type { DateRange } from "@/lib/dates";
import type { GetBalanceStatsResponseType } from "@/lib/transactions";
import type { Period, Timeframe, TransactionType } from "@/lib/types";
import type { QueryClient, QueryKey } from "@tanstack/react-query";

import { moneyText, toMoney } from "@/lib/money";

export const queryKeys = {
  apiTokens: ["apiTokens"] satisfies QueryKey,
  balances: (walletId: string): QueryKey => ["balances", walletId],
  settlements: (walletId: string): QueryKey => ["settlements", walletId],
  budgets: (walletId: string): QueryKey => ["budgets", walletId],
  categories: (walletId: string, type?: string | null): QueryKey =>
    type ? ["categories", walletId, type] : ["categories", walletId],
  goals: (walletId: string): QueryKey => ["goals", walletId],
  wallet: (walletId: string): QueryKey => ["wallet", walletId],
  walletMembers: (walletId: string): QueryKey => ["walletMembers", walletId],
  formerMembers: (walletId: string): QueryKey => ["formerMembers", walletId],
  wallets: ["wallets"] satisfies QueryKey,
  insights: (walletId: string): QueryKey => ["insights", walletId],
  inviteLinks: (walletId: string): QueryKey => ["inviteLinks", walletId],
  notifications: (walletId: string): QueryKey => ["notifications", walletId],
  overview: {
    all: ["overview"] satisfies QueryKey,
    statsAll: ["overview", "stats"] satisfies QueryKey,
    stats: (walletId: string, from: Date, to: Date): QueryKey => [
      "overview",
      "stats",
      walletId,
      from,
      to,
    ],
    categories: (walletId: string, from: Date, to: Date): QueryKey => [
      "overview",
      "stats",
      "categories",
      walletId,
      from,
      to,
    ],
    history: (
      walletId: string,
      timeframe: Timeframe,
      period: Period,
    ): QueryKey => ["overview", "history", walletId, timeframe, period],
  },
  recurringItems: (walletId: string): QueryKey => ["recurringItems", walletId],
  sharedSpending: (walletId: string): QueryKey => ["shared-spending", walletId],
  safeToSpend: (walletId: string): QueryKey => ["safe-to-spend", walletId],
  simplifiedDebts: (walletId: string): QueryKey => [
    "simplified-debts",
    walletId,
  ],
  transactions: {
    all: ["transactions"] satisfies QueryKey,
    history: (
      walletId: string,
      from: string,
      to: string,
      pageSize: number,
    ): QueryKey => ["transactions", "history", walletId, from, to, pageSize],
  },
};

export const queryKeyPrefixes = {
  balances: ["balances"] satisfies QueryKey,
  settlements: ["settlements"] satisfies QueryKey,
  budgets: ["budgets"] satisfies QueryKey,
  categories: ["categories"] satisfies QueryKey,
  goals: ["goals"] satisfies QueryKey,
  wallet: ["wallet"] satisfies QueryKey,
  walletMembers: ["walletMembers"] satisfies QueryKey,
  formerMembers: ["formerMembers"] satisfies QueryKey,
  insights: ["insights"] satisfies QueryKey,
  inviteLinks: ["inviteLinks"] satisfies QueryKey,
  notifications: ["notifications"] satisfies QueryKey,
  recurringItems: ["recurringItems"] satisfies QueryKey,
  sharedSpending: ["shared-spending"] satisfies QueryKey,
  safeToSpend: ["safe-to-spend"] satisfies QueryKey,
  simplifiedDebts: ["simplified-debts"] satisfies QueryKey,
  transactions: ["transactions"] satisfies QueryKey,
  overview: ["overview"] satisfies QueryKey,
};

type TransactionOptimisticInput = {
  amount: string;
  date: Date;
  type: TransactionType;
};

export type TransactionOptimisticContext = {
  invalidate: () => void;
  rollback: () => void;
};

function statsRange(key: QueryKey): DateRange | null {
  const from = key[3];
  const to = key[4];
  if (!(from instanceof Date) || !(to instanceof Date)) return null;
  return { from, to };
}

export async function applyTransactionOptimistic(
  queryClient: QueryClient,
  input: TransactionOptimisticInput,
): Promise<TransactionOptimisticContext> {
  await queryClient.cancelQueries({ queryKey: queryKeys.overview.all });

  const previousStats = queryClient.getQueriesData<GetBalanceStatsResponseType>(
    { queryKey: queryKeys.overview.statsAll },
  );

  for (const [key, stats] of previousStats) {
    const range = statsRange(key);
    if (
      !stats ||
      typeof stats.income !== "string" ||
      typeof stats.expense !== "string" ||
      !range ||
      input.date < range.from ||
      input.date > range.to
    ) {
      continue;
    }
    queryClient.setQueryData<GetBalanceStatsResponseType>(key, (current) => {
      if (!current) return current;
      return input.type === "income"
        ? {
            ...current,
            income: moneyText(toMoney(current.income).plus(input.amount)),
          }
        : {
            ...current,
            expense: moneyText(toMoney(current.expense).plus(input.amount)),
          };
    });
  }

  return {
    invalidate: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.overview.all });
      void queryClient.invalidateQueries({
        queryKey: queryKeyPrefixes.goals,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeyPrefixes.recurringItems,
      });
    },
    rollback: () => {
      for (const [key, stats] of previousStats) {
        queryClient.setQueryData(key, stats);
      }
    },
  };
}
