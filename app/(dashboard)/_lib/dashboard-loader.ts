import type { DashboardContext } from "./dashboard-context";
import type { DehydratedState } from "@tanstack/react-query";

import { cacheLife } from "next/cache";

import {
  blockingKeys,
  hydrationStateFor,
  loadBlockingSeededReads,
  type BlockingDataset,
} from "@/lib/seeded-reads";

export type DashboardPayload = DashboardContext & BlockingDataset;

export async function loadDashboard(
  context: DashboardContext,
): Promise<DashboardPayload> {
  return { ...context, ...(await loadBlockingSeededReads(context)) };
}

export async function dashboardHydrationState(
  payload: DashboardPayload,
): Promise<DehydratedState> {
  return hydrationStateFor(blockingKeys, payload, payload);
}

export async function loadDashboardState(context: DashboardContext) {
  "use cache: private";
  cacheLife({ stale: 300 });

  const payload = await loadDashboard(context);
  return { payload, state: await dashboardHydrationState(payload) };
}
