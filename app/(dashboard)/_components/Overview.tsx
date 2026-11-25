import { getBalanceStats, getCategoriesStats } from "@/lib/transactions";

import OverviewClient from "./OverviewClient";

interface Props {
  householdId: string;
  currency: string | null;
  initialDateRange: { from: Date; to: Date };
}

const Overview = async ({ householdId, currency, initialDateRange }: Props) => {
  const [stats, categories] = await Promise.all([
    getBalanceStats(householdId, initialDateRange.from, initialDateRange.to),
    getCategoriesStats(householdId, initialDateRange.from, initialDateRange.to),
  ]);

  return (
    <OverviewClient
      householdId={householdId}
      currency={currency}
      initialDateRange={initialDateRange}
      initialStats={stats}
      initialCategories={categories}
    />
  );
};

export default Overview;
