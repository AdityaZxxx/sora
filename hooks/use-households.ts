import { useQuery } from "@tanstack/react-query";

import { POLL_INTERVAL } from "@/lib/constants";
import { fetchReadJson } from "@/lib/fetch-json";
import { queryKeys } from "@/lib/query-keys";

export type HouseholdsResponse = {
  active: { id: string };
  households: {
    id: string;
    name: string | null;
    currency: string | null;
    memberCount: number;
    joinedAt: string;
  }[];
};

export function useHouseholds() {
  return useQuery<HouseholdsResponse>({
    queryKey: queryKeys.households,
    queryFn: () =>
      fetchReadJson<HouseholdsResponse>(
        "/api/households",
        "Failed to load households",
      ),
    staleTime: POLL_INTERVAL,
    refetchInterval: POLL_INTERVAL,
    refetchOnWindowFocus: true,
  });
}
