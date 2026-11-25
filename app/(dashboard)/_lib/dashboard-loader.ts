import type { DashboardContext } from "./dashboard-context";

import {
  dehydrate,
  QueryClient,
  type DehydratedState,
} from "@tanstack/react-query";
import { cacheLife } from "next/cache";

import { getMemberBalances, getSimplifiedTransfers } from "@/lib/balances";
import { getBudgetsWithProgress, getSharedSpending } from "@/lib/budgets";
import { getGoalsWithProgress } from "@/lib/goals";
import { getHistoryData } from "@/lib/history";
import { getMonthlyRollup } from "@/lib/insights";
import { queryKeys } from "@/lib/query-keys";
import { listRecurringItems } from "@/lib/recurring";

export type DashboardPayload = DashboardContext & {
  insights: Awaited<ReturnType<typeof getMonthlyRollup>>;
  budgets: Awaited<ReturnType<typeof getBudgetsWithProgress>>;
  recurringItems: Awaited<ReturnType<typeof listRecurringItems>>;
  sharedSpending: Awaited<ReturnType<typeof getSharedSpending>>;
  balances: Awaited<ReturnType<typeof getMemberBalances>>;
  simplifiedDebts: Awaited<ReturnType<typeof getSimplifiedTransfers>>;
  goals: Awaited<ReturnType<typeof getGoalsWithProgress>>;
  historyData: Awaited<ReturnType<typeof getHistoryData>>;
};

export async function loadDashboard(
  context: DashboardContext,
): Promise<DashboardPayload> {
  const { householdId, userId, historyView } = context;

  const [
    insights,
    budgets,
    recurringItems,
    sharedSpending,
    balances,
    simplifiedDebts,
    goals,
    historyData,
  ] = await Promise.all([
    getMonthlyRollup(householdId),
    getBudgetsWithProgress(householdId),
    listRecurringItems(householdId),
    getSharedSpending(householdId),
    getMemberBalances(householdId, userId),
    getSimplifiedTransfers(householdId),
    getGoalsWithProgress(householdId),
    getHistoryData(householdId, historyView.timeframe, historyView.period),
  ]);

  return {
    ...context,
    insights,
    budgets,
    recurringItems,
    sharedSpending,
    balances,
    simplifiedDebts,
    goals,
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
    queryKeys.overview.history(
      payload.historyView.timeframe,
      payload.historyView.period,
    ),
    payload.historyData,
  );

  return dehydrate(queryClient);
}

export async function loadDashboardState(context: DashboardContext) {
  "use cache: private";
  cacheLife({ stale: 300 });

  const payload = await loadDashboard(context);
  return { payload, state: dashboardHydrationState(payload) };
}
