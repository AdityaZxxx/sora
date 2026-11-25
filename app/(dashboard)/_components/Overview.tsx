import { getBalanceStats, getCategoriesStats } from "@/lib/transactions";

import OverviewClient from "./OverviewClient";

interface Props {
  walletId: string;
  currency: string | null;
  initialDateRange: { from: Date; to: Date };
}

const Overview = async ({ walletId, currency, initialDateRange }: Props) => {
  const [stats, categories] = await Promise.all([
    getBalanceStats(walletId, initialDateRange.from, initialDateRange.to),
    getCategoriesStats(walletId, initialDateRange.from, initialDateRange.to),
  ]);

  return (
    <OverviewClient
      walletId={walletId}
      currency={currency}
      initialDateRange={initialDateRange}
      initialStats={stats}
      initialCategories={categories}
    />
  );
};

export default Overview;
