import { requireHousehold } from "@/lib/household";
import { getBalanceStats, getCategoriesStats } from "@/lib/transactions";

import OverviewClient from "./OverviewClient";

interface Props {
  currency: string | null;
  initialDateRange: { from: Date; to: Date };
}

const Overview = async ({ currency, initialDateRange }: Props) => {
  const result = await requireHousehold();
  if (!result) {
    return null;
  }

  const householdId = result.household.id;
  const [stats, categories] = await Promise.all([
    getBalanceStats(householdId, initialDateRange.from, initialDateRange.to),
    getCategoriesStats(householdId, initialDateRange.from, initialDateRange.to),
  ]);

  return (
    <OverviewClient
      currency={currency}
      initialDateRange={initialDateRange}
      initialStats={stats}
      initialCategories={categories}
    />
  );
};

export default Overview;
