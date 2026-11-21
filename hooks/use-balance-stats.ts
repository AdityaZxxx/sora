"use client";

import type { GetBalanceStatsResponseType } from "@/lib/transactions";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

import { logClientError } from "@/instrumentation-client";
import { QUERY_STALE_TIME } from "@/lib/constants";
import { fetchReadJson } from "@/lib/fetch-json";
import { queryKeys } from "@/lib/query-keys";

export function useBalanceStats(from: Date, to: Date) {
  return useQuery<GetBalanceStatsResponseType>({
    queryKey: queryKeys.overview.stats(from, to),
    queryFn: async () => {
      try {
        return await fetchReadJson<GetBalanceStatsResponseType>(
          `/api/stats/balance?from=${format(from, "yyyy-MM-dd")}&to=${format(
            to,
            "yyyy-MM-dd",
          )}`,
          "Failed to fetch balance stats",
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
  });
}
