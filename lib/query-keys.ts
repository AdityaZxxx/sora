import type { DateRange } from "@/lib/dates";
import type { GetBalanceStatsResponseType } from "@/lib/transactions";
import type { Period, Timeframe, TransactionType } from "@/lib/types";
import type { QueryClient, QueryKey } from "@tanstack/react-query";

export const queryKeys = {
  apiTokens: ["apiTokens"] satisfies QueryKey,
  balances: ["balances"] satisfies QueryKey,
  settlements: ["settlements"] satisfies QueryKey,
  budgets: ["budgets"] satisfies QueryKey,
  categories: (type?: string | null): QueryKey =>
    type ? ["categories", type] : ["categories"],
  goals: ["goals"] satisfies QueryKey,
  wallet: ["wallet"] satisfies QueryKey,
  walletMembers: ["walletMembers"] satisfies QueryKey,
  formerMembers: ["formerMembers"] satisfies QueryKey,
  wallets: ["wallets"] satisfies QueryKey,
  insights: ["insights"] satisfies QueryKey,
  inviteLinks: ["inviteLinks"] satisfies QueryKey,
  notifications: ["notifications"] satisfies QueryKey,
  overview: {
    all: ["overview"] satisfies QueryKey,
    statsAll: ["overview", "stats"] satisfies QueryKey,
    stats: (walletId: string | undefined, from: Date, to: Date): QueryKey => [
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
  recurringItems: ["recurringItems"] satisfies QueryKey,
  sharedSpending: ["shared-spending"] satisfies QueryKey,
  simplifiedDebts: ["simplified-debts"] satisfies QueryKey,
  transactions: {
    all: ["transactions"] satisfies QueryKey,
    history: (from: string, to: string, pageSize: number): QueryKey => [
      "transactions",
      "history",
      from,
      to,
      pageSize,
    ],
  },
};

type TransactionOptimisticInput = {
  amount: number;
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
      typeof stats.income !== "number" ||
      typeof stats.expense !== "number" ||
      !range ||
      input.date < range.from ||
      input.date > range.to
    ) {
      continue;
    }
    queryClient.setQueryData<GetBalanceStatsResponseType>(key, (current) => {
      if (!current) return current;
      return input.type === "income"
        ? { ...current, income: current.income + input.amount }
        : { ...current, expense: current.expense + input.amount };
    });
  }

  return {
    invalidate: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.overview.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.goals });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.recurringItems,
      });
    },
    rollback: () => {
      for (const [key, stats] of previousStats) {
        queryClient.setQueryData(key, stats);
      }
    },
  };
}
