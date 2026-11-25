import { useQuery } from "@tanstack/react-query";

import { POLL_INTERVAL } from "@/lib/constants";
import { fetchReadJson } from "@/lib/fetch-json";
import { queryKeys } from "@/lib/query-keys";

export type WalletsResponse = {
  active: { id: string };
  wallets: {
    id: string;
    name: string | null;
    currency: string | null;
    memberCount: number;
    joinedAt: string;
  }[];
};

export function useWallets() {
  return useQuery<WalletsResponse>({
    queryKey: queryKeys.wallets,
    queryFn: () =>
      fetchReadJson<WalletsResponse>("/api/wallets", "Failed to load wallets"),
    staleTime: POLL_INTERVAL,
    refetchInterval: POLL_INTERVAL,
    refetchOnWindowFocus: true,
  });
}
