import type { ReactNode } from "react";

import { HydrationBoundary } from "@tanstack/react-query";
import { cacheLife } from "next/cache";

import Navbar from "@/components/Navbar";
import { CACHE_RESOURCE, walletTag, memberWalletsTag } from "@/lib/cache";
import { seedQuery, seededHydrationState } from "@/lib/hydration";
import { listMembers } from "@/lib/members";
import { listNotifications } from "@/lib/notifications";
import { queryKeys } from "@/lib/query-keys";
import { cachedWalletsForMember, requireWallet } from "@/lib/wallet";

const SeededDashboardShell = async ({ children }: { children: ReactNode }) => {
  "use cache: private";
  cacheLife({ stale: 300 });

  const result = await requireWallet();
  if (!result) {
    return (
      <>
        <Navbar />
        {children}
      </>
    );
  }

  const walletId = result.wallet.id;
  const userId = result.session.user.id;
  const [wallets, notifications, members] = await Promise.all([
    cachedWalletsForMember(userId, walletId),
    listNotifications(walletId, userId),
    listMembers(walletId),
  ]);

  const state = await seededHydrationState(
    [
      seedQuery(queryKeys.wallets, wallets),
      seedQuery(queryKeys.notifications, notifications),
      seedQuery(queryKeys.walletMembers, members),
    ],
    [
      memberWalletsTag(userId),
      walletTag(walletId, CACHE_RESOURCE.wallet),
      walletTag(walletId, CACHE_RESOURCE.members),
      walletTag(walletId, CACHE_RESOURCE.notifications),
    ],
  );

  return (
    <HydrationBoundary state={state}>
      <Navbar />
      {children}
    </HydrationBoundary>
  );
};

export default SeededDashboardShell;
