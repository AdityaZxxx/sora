"use client";

import type { GetBalanceStatsResponseType } from "@/lib/transactions";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { logClientError } from "@/instrumentation-client";
import { QUERY_STALE_TIME } from "@/lib/constants";
import { fetchReadJson } from "@/lib/fetch-json";
import { queryKeys } from "@/lib/query-keys";

type UseBalanceStatsOptions = {
  enabled?: boolean;
  initialData?: GetBalanceStatsResponseType;
};

export function useBalanceStats(
  householdId: string | undefined,
  from: Date,
  to: Date,
  { enabled = true, initialData }: UseBalanceStatsOptions = {},
) {
  return useQuery<GetBalanceStatsResponseType>({
    queryKey: queryKeys.overview.stats(householdId, from, to),
    initialData,
    queryFn: async () => {
      try {
        return await fetchReadJson<GetBalanceStatsResponseType>(
          "/api/stats/balance",
          "Failed to fetch balance stats",
          { params: { from, to } },
        );
      } catch (cause) {
        logClientError("stats.fetch-failed", {
          error: cause instanceof Error ? cause.message : String(cause),
        });
        throw cause;
      }
    },
    staleTime: QUERY_STALE_TIME,
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
    enabled,
  });
}
