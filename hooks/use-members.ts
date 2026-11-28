import type { listFormerMembers, listMembers } from "@/lib/members";

import { useQuery } from "@tanstack/react-query";

import { useActiveWallet } from "@/hooks/use-wallets";
import { useSession } from "@/lib/auth-client";
import { POLL_INTERVAL, QUERY_STALE_TIME } from "@/lib/constants";
import { fetchReadJson } from "@/lib/fetch-json";
import { queryKeys } from "@/lib/query-keys";
import {
  canManage as roleCanManage,
  canWrite as roleCanWrite,
  isOwner as roleIsOwner,
  parseMemberRole,
  type MemberRole,
} from "@/lib/roles";

export function useMembers() {
  const { data: wallets } = useActiveWallet();
  const walletId = wallets?.active.id ?? "";
  return useQuery({
    queryKey: queryKeys.walletMembers(walletId),
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

export function useFormerMembers() {
  const { data: wallets } = useActiveWallet();
  const walletId = wallets?.active.id ?? "";
  return useQuery({
    queryKey: queryKeys.formerMembers(walletId),
    queryFn: () =>
      fetchReadJson<Awaited<ReturnType<typeof listFormerMembers>>>(
        "/api/former-members",
        "Unable to load past members. Refresh the page and try again.",
      ),
    staleTime: QUERY_STALE_TIME,
  });
}

export function useCallerRole() {
  const { data: session } = useSession();
  const membersQuery = useMembers();

  const self = membersQuery.data?.find(
    (member) => member.user.id === session?.user.id,
  );
  const role: MemberRole | undefined = self
    ? parseMemberRole(self.role)
    : undefined;

  return {
    role,
    userId: session?.user.id,
    canEdit: role ? roleCanWrite(role) : false,
    canManage: role ? roleCanManage(role) : false,
    isOwner: role ? roleIsOwner(role) : false,
  };
}
