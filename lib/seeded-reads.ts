import type { Period, Timeframe } from "@/lib/types";
import type { DehydratedState, QueryKey } from "@tanstack/react-query";

import { getMemberBalances, getSimplifiedTransfers } from "@/lib/balances";
import { getBudgetsWithProgress, getSharedSpending } from "@/lib/budgets";
import { CACHE_RESOURCE, memberWalletsTag, walletTag } from "@/lib/cache";
import { getCategories } from "@/lib/categories";
import { TRANSACTION_HISTORY_INITIAL_PAGE_SIZE } from "@/lib/constants";
import { resolveDateRange, utcDateValue } from "@/lib/dates";
import { DomainError } from "@/lib/errors";
import { getGoalsWithProgress } from "@/lib/goals";
import { getHistoryData } from "@/lib/history";
import { seedQuery, seededHydrationState } from "@/lib/hydration";
import { getMonthlyRollup } from "@/lib/insights";
import { listInviteLinks } from "@/lib/invites";
import { listMembers } from "@/lib/members";
import { listNotifications } from "@/lib/notifications";
import { queryKeys } from "@/lib/query-keys";
import { listRecurringItems } from "@/lib/recurring";
import {
  getBalanceStats,
  getCategoriesStats,
  getTransactionsHistory,
} from "@/lib/transactions";
import { cachedWalletsForMember } from "@/lib/wallet";

export type SeedContext = {
  walletId: string;
  userId: string;
  historyView: { timeframe: Timeframe; period: Period };
  dateRange: { from: Date; to: Date };
};

type SeededRead<Data> = {
  read: (ctx: SeedContext) => Promise<Data>;
  queryKey: (ctx: SeedContext) => QueryKey;
  tags: (ctx: SeedContext) => readonly string[];
  blocking: boolean;
  infinite?: boolean;
};

const dashboardReads = {
  insights: {
    read: (ctx) => getMonthlyRollup(ctx.walletId),
    queryKey: (ctx) => queryKeys.insights(ctx.walletId),
    tags: (ctx) => [walletTag(ctx.walletId, CACHE_RESOURCE.insights)],
    blocking: true,
  },
  budgets: {
    read: (ctx) => getBudgetsWithProgress(ctx.walletId),
    queryKey: (ctx) => queryKeys.budgets(ctx.walletId),
    tags: (ctx) => [walletTag(ctx.walletId, CACHE_RESOURCE.budgets)],
    blocking: true,
  },
  recurringItems: {
    read: (ctx) => listRecurringItems(ctx.walletId),
    queryKey: (ctx) => queryKeys.recurringItems(ctx.walletId),
    tags: (ctx) => [walletTag(ctx.walletId, CACHE_RESOURCE.recurring)],
    blocking: true,
  },
  sharedSpending: {
    read: (ctx) => getSharedSpending(ctx.walletId),
    queryKey: (ctx) => queryKeys.sharedSpending(ctx.walletId),
    tags: (ctx) => [walletTag(ctx.walletId, CACHE_RESOURCE.budgets)],
    blocking: true,
  },
  balances: {
    read: (ctx) => getMemberBalances(ctx.walletId, ctx.userId),
    queryKey: (ctx) => queryKeys.balances(ctx.walletId),
    tags: (ctx) => [walletTag(ctx.walletId, CACHE_RESOURCE.balances)],
    blocking: true,
  },
  simplifiedDebts: {
    read: (ctx) => getSimplifiedTransfers(ctx.walletId),
    queryKey: (ctx) => queryKeys.simplifiedDebts(ctx.walletId),
    tags: (ctx) => [walletTag(ctx.walletId, CACHE_RESOURCE.balances)],
    blocking: true,
  },
  goals: {
    read: (ctx) => getGoalsWithProgress(ctx.walletId),
    queryKey: (ctx) => queryKeys.goals(ctx.walletId),
    tags: (ctx) => [walletTag(ctx.walletId, CACHE_RESOURCE.goals)],
    blocking: true,
  },
  historyData: {
    read: (ctx) =>
      getHistoryData(
        ctx.walletId,
        ctx.historyView.timeframe,
        ctx.historyView.period,
      ),
    queryKey: (ctx) =>
      queryKeys.overview.history(
        ctx.walletId,
        ctx.historyView.timeframe,
        ctx.historyView.period,
      ),
    tags: (ctx) => [walletTag(ctx.walletId, CACHE_RESOURCE.history)],
    blocking: true,
  },
} as const satisfies Record<string, SeededRead<unknown>>;

const overviewReads = {
  overviewStats: {
    read: (ctx) =>
      getBalanceStats(ctx.walletId, ctx.dateRange.from, ctx.dateRange.to),
    queryKey: (ctx) =>
      queryKeys.overview.stats(
        ctx.walletId,
        ctx.dateRange.from,
        ctx.dateRange.to,
      ),
    tags: (ctx) => [walletTag(ctx.walletId, CACHE_RESOURCE.transactions)],
    blocking: false,
  },
  overviewCategories: {
    read: (ctx) =>
      getCategoriesStats(ctx.walletId, ctx.dateRange.from, ctx.dateRange.to),
    queryKey: (ctx) =>
      queryKeys.overview.categories(
        ctx.walletId,
        ctx.dateRange.from,
        ctx.dateRange.to,
      ),
    tags: (ctx) => [walletTag(ctx.walletId, CACHE_RESOURCE.categories)],
    blocking: false,
  },
} as const satisfies Record<string, SeededRead<unknown>>;

const shellReads = {
  wallets: {
    read: (ctx) => cachedWalletsForMember(ctx.userId, ctx.walletId),
    queryKey: () => queryKeys.wallets,
    tags: (ctx) => [
      memberWalletsTag(ctx.userId),
      walletTag(ctx.walletId, CACHE_RESOURCE.wallet),
    ],
    blocking: false,
  },
  notifications: {
    read: (ctx) => listNotifications(ctx.walletId, ctx.userId),
    queryKey: (ctx) => queryKeys.notifications(ctx.walletId),
    tags: (ctx) => [walletTag(ctx.walletId, CACHE_RESOURCE.notifications)],
    blocking: false,
  },
  walletMembers: {
    read: (ctx) => listMembers(ctx.walletId),
    queryKey: (ctx) => queryKeys.walletMembers(ctx.walletId),
    tags: (ctx) => [walletTag(ctx.walletId, CACHE_RESOURCE.members)],
    blocking: false,
  },
} as const satisfies Record<string, SeededRead<unknown>>;

const manageReads = {
  incomeCategories: {
    read: (ctx) => getCategories(ctx.walletId, "income"),
    queryKey: (ctx) => queryKeys.categories(ctx.walletId, "income"),
    tags: (ctx) => [walletTag(ctx.walletId, CACHE_RESOURCE.categories)],
    blocking: false,
  },
  expenseCategories: {
    read: (ctx) => getCategories(ctx.walletId, "expense"),
    queryKey: (ctx) => queryKeys.categories(ctx.walletId, "expense"),
    tags: (ctx) => [walletTag(ctx.walletId, CACHE_RESOURCE.categories)],
    blocking: false,
  },
  manageBudgets: {
    read: (ctx) => getBudgetsWithProgress(ctx.walletId),
    queryKey: (ctx) => queryKeys.budgets(ctx.walletId),
    tags: (ctx) => [walletTag(ctx.walletId, CACHE_RESOURCE.budgets)],
    blocking: false,
  },
  inviteLinks: {
    read: (ctx) => listInviteLinks(ctx.walletId),
    queryKey: (ctx) => queryKeys.inviteLinks(ctx.walletId),
    tags: (ctx) => [walletTag(ctx.walletId, CACHE_RESOURCE.invites)],
    blocking: false,
  },
} as const satisfies Record<string, SeededRead<unknown>>;

const transactionsReads = {
  transactionsHistory: {
    read: async (ctx) => ({
      pages: [
        await getTransactionsHistory(
          ctx.walletId,
          ctx.dateRange.from,
          ctx.dateRange.to,
          { limit: TRANSACTION_HISTORY_INITIAL_PAGE_SIZE },
        ),
      ],
      pageParams: [null],
    }),
    queryKey: (ctx) =>
      queryKeys.transactions.history(
        ctx.walletId,
        utcDateValue(ctx.dateRange.from),
        utcDateValue(ctx.dateRange.to),
        TRANSACTION_HISTORY_INITIAL_PAGE_SIZE,
      ),
    tags: (ctx) => [walletTag(ctx.walletId, CACHE_RESOURCE.transactions)],
    blocking: false,
    infinite: true,
  },
} as const satisfies Record<string, SeededRead<unknown>>;

export const seededReads = {
  ...dashboardReads,
  ...overviewReads,
  ...shellReads,
  ...manageReads,
  ...transactionsReads,
};

export type SeededKey = keyof typeof seededReads;

export type SeededDataset = {
  [Key in SeededKey]: Awaited<ReturnType<(typeof seededReads)[Key]["read"]>>;
};

export type BlockingKeys = {
  [Key in SeededKey]: (typeof seededReads)[Key]["blocking"] extends true
    ? Key
    : never;
}[SeededKey];

export type BlockingDataset = Pick<SeededDataset, BlockingKeys>;

export const blockingKeys = Object.keys(seededReads).filter(
  (key) => seededReads[key as SeededKey].blocking,
) as BlockingKeys[];

export function seedContextFor(
  walletId: string,
  userId: string,
  dateRange: { from: Date; to: Date } = resolveDateRange(),
): SeedContext {
  return {
    walletId,
    userId,
    dateRange,
    historyView: {
      timeframe: "month",
      period: {
        month: dateRange.to.getUTCMonth(),
        year: dateRange.to.getUTCFullYear(),
      },
    },
  };
}

export async function loadBlockingSeededReads(
  ctx: SeedContext,
): Promise<BlockingDataset> {
  const values = await Promise.all(
    blockingKeys.map((key) => seededReads[key].read(ctx)),
  );

  return Object.fromEntries(
    blockingKeys.map((key, index) => [key, values[index]]),
  ) as BlockingDataset;
}

export async function hydrationStateFor(
  keys: readonly SeededKey[],
  ctx: SeedContext,
  data: Partial<SeededDataset>,
): Promise<DehydratedState> {
  const queries = keys.map((key) => {
    const value = data[key];
    if (value === undefined) {
      throw new DomainError(`Missing seeded read data for "${key}"`);
    }
    const entry = seededReads[key];
    const infinite = "infinite" in entry ? entry.infinite : undefined;
    return seedQuery(entry.queryKey(ctx), value, infinite);
  });
  const tags = [...new Set(keys.flatMap((key) => seededReads[key].tags(ctx)))];

  return seededHydrationState(queries, tags);
}
