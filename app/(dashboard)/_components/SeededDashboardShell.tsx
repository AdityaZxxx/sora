import type { ReactNode } from "react";

import { HydrationBoundary } from "@tanstack/react-query";
import { cacheLife } from "next/cache";

import Navbar from "@/components/Navbar";
import {
  hydrationStateFor,
  seedContextFor,
  seededReads,
} from "@/lib/seeded-reads";
import { requireWallet } from "@/lib/wallet";

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
  const ctx = seedContextFor(walletId, result.session.user.id);
  const [wallets, notifications, walletMembers] = await Promise.all([
    seededReads.wallets.read(ctx),
    seededReads.notifications.read(ctx),
    seededReads.walletMembers.read(ctx),
  ]);

  const state = await hydrationStateFor(
    ["wallets", "notifications", "walletMembers"],
    ctx,
    { wallets, notifications, walletMembers },
  );

  return (
    <HydrationBoundary state={state}>
      <Navbar />
      {children}
    </HydrationBoundary>
  );
};

export default SeededDashboardShell;
