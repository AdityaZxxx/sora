import type { listMembers } from "@/lib/members";

import { useQuery } from "@tanstack/react-query";

import { useSession } from "@/lib/auth-client";
import { POLL_INTERVAL, VIEW_ONLY_ROLE } from "@/lib/constants";
import { fetchReadJson } from "@/lib/fetch-json";
import { queryKeys } from "@/lib/query-keys";

export function useMembers() {
  return useQuery({
    queryKey: queryKeys.householdMembers,
    queryFn: () =>
      fetchReadJson<Awaited<ReturnType<typeof listMembers>>>(
        "/api/members",
        "Unable to load the members. Refresh the page and try again.",
      ),
    staleTime: POLL_INTERVAL,
    refetchInterval: POLL_INTERVAL,
    refetchOnWindowFocus: true,
  });
}

export function useCallerRole() {
  const { data: session } = useSession();
  const membersQuery = useMembers();

  const self = membersQuery.data?.find(
    (member) => member.user.id === session?.user.id,
  );

  return {
    role: self?.role,
    canEdit: self ? self.role !== VIEW_ONLY_ROLE : true,
  };
}
