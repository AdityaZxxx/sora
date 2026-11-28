import { HydrationBoundary } from "@tanstack/react-query";

import {
  hydrationStateFor,
  seedContextFor,
  seededReads,
} from "@/lib/seeded-reads";

import OverviewClient from "./OverviewClient";

interface Props {
  walletId: string;
  userId: string;
  currency: string | null;
  initialDateRange: { from: Date; to: Date };
}

const Overview = async ({
  walletId,
  userId,
  currency,
  initialDateRange,
}: Props) => {
  const ctx = seedContextFor(walletId, userId, initialDateRange);
  const [overviewStats, overviewCategories] = await Promise.all([
    seededReads.overviewStats.read(ctx),
    seededReads.overviewCategories.read(ctx),
  ]);

  const state = await hydrationStateFor(
    ["overviewStats", "overviewCategories"],
    ctx,
    { overviewStats, overviewCategories },
  );

  return (
    <HydrationBoundary state={state}>
      <OverviewClient
        walletId={walletId}
        currency={currency}
        initialDateRange={initialDateRange}
      />
    </HydrationBoundary>
  );
};

export default Overview;
