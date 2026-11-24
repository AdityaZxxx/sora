import type { Period, Timeframe } from "@/lib/types";

import {
  dehydrate,
  QueryClient,
  type DehydratedState,
} from "@tanstack/react-query";
import { notFound } from "next/navigation";

import { getMemberBalances, getSimplifiedTransfers } from "@/lib/balances";
import { getBudgetsWithProgress, getSharedSpending } from "@/lib/budgets";
import { VIEW_ONLY_ROLE } from "@/lib/constants";
import { resolveDateRange } from "@/lib/dates";
import { getGoalsWithProgress } from "@/lib/goals";
import { getHistoryData } from "@/lib/history";
import { countHouseholdMembers, requireHousehold } from "@/lib/household";
import { getMonthlyRollup } from "@/lib/insights";
import { queryKeys } from "@/lib/query-keys";
import { listRecurringItems } from "@/lib/recurring";
import { getBalanceStats, getCategoriesStats } from "@/lib/transactions";

export type DashboardPayload = {
  userName: string;
  currency: string;
  canEdit: boolean;
  memberCount: number;
  dateRange: { from: Date; to: Date };
  historyView: { timeframe: Timeframe; period: Period };
  insights: Awaited<ReturnType<typeof getMonthlyRollup>>;
  budgets: Awaited<ReturnType<typeof getBudgetsWithProgress>>;
  recurringItems: Awaited<ReturnType<typeof listRecurringItems>>;
  sharedSpending: Awaited<ReturnType<typeof getSharedSpending>>;
  balances: Awaited<ReturnType<typeof getMemberBalances>>;
  simplifiedDebts: Awaited<ReturnType<typeof getSimplifiedTransfers>>;
  goals: Awaited<ReturnType<typeof getGoalsWithProgress>>;
  stats: Awaited<ReturnType<typeof getBalanceStats>>;
  categoriesStats: Awaited<ReturnType<typeof getCategoriesStats>>;
  historyData: Awaited<ReturnType<typeof getHistoryData>>;
};

export async function loadDashboard(): Promise<DashboardPayload | null> {
  const result = await requireHousehold();
  if (!result) {
    notFound();
  }
  const currency = result.household.currency;
  if (!currency) {
    return null;
  }

  const { session, household, membership } = result;
  const householdId = household.id;
  const dateRange = resolveDateRange();
  const historyView: { timeframe: Timeframe; period: Period } = {
    timeframe: "month",
    period: {
      month: dateRange.to.getUTCMonth(),
      year: dateRange.to.getUTCFullYear(),
    },
  };

  const [
    memberCount,
    insights,
    budgets,
    recurringItems,
    sharedSpending,
    balances,
    simplifiedDebts,
    goals,
    stats,
    categoriesStats,
    historyData,
  ] = await Promise.all([
    countHouseholdMembers(householdId),
    getMonthlyRollup(householdId),
    getBudgetsWithProgress(householdId),
    listRecurringItems(householdId),
    getSharedSpending(householdId),
    getMemberBalances(householdId, session.user.id),
    getSimplifiedTransfers(householdId),
    getGoalsWithProgress(householdId),
    getBalanceStats(householdId, dateRange.from, dateRange.to),
    getCategoriesStats(householdId, dateRange.from, dateRange.to),
    getHistoryData(householdId, historyView.timeframe, historyView.period),
  ]);

  return {
    userName: session.user.name,
    currency,
    canEdit: membership.role !== VIEW_ONLY_ROLE,
    memberCount,
    dateRange,
    historyView,
    insights,
    budgets,
    recurringItems,
    sharedSpending,
    balances,
    simplifiedDebts,
    goals,
    stats,
    categoriesStats,
    historyData,
  };
}

export function dashboardHydrationState(
  payload: DashboardPayload,
): DehydratedState {
  const queryClient = new QueryClient();

  queryClient.setQueryData(queryKeys.insights, payload.insights);
  queryClient.setQueryData(queryKeys.budgets, payload.budgets);
  queryClient.setQueryData(queryKeys.recurringItems, payload.recurringItems);
  queryClient.setQueryData(queryKeys.sharedSpending, payload.sharedSpending);
  queryClient.setQueryData(queryKeys.balances, payload.balances);
  queryClient.setQueryData(queryKeys.simplifiedDebts, payload.simplifiedDebts);
  queryClient.setQueryData(queryKeys.goals, payload.goals);
  queryClient.setQueryData(
    queryKeys.overview.stats(payload.dateRange.from, payload.dateRange.to),
    payload.stats,
  );
  queryClient.setQueryData(
    queryKeys.overview.categories(payload.dateRange.from, payload.dateRange.to),
    payload.categoriesStats,
  );
  queryClient.setQueryData(
    queryKeys.overview.history(
      payload.historyView.timeframe,
      payload.historyView.period,
    ),
    payload.historyData,
  );

  return dehydrate(queryClient);
}
