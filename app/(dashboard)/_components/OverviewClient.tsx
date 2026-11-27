"use client";

import type {
  GetBalanceStatsResponseType,
  GetCategoriesStatsResponseType,
} from "@/lib/transactions";

import { differenceInDays } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

import { DateRangePicker } from "@/components/ui/date-range-picker";
import { MAX_DATE_RANGE } from "@/lib/constants";

import CategoriesStats from "./CategoriesStats";
import StatsCards from "./StatsCards";

interface Props {
  walletId: string;
  currency: string | null;
  initialDateRange: { from: Date; to: Date };
  initialStats: GetBalanceStatsResponseType;
  initialCategories: GetCategoriesStatsResponseType;
}

const OverviewClient = ({
  walletId,
  currency,
  initialDateRange,
  initialStats,
  initialCategories,
}: Props) => {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(
    () => initialDateRange,
  );
  // `initialData` seeds a new key as fresh. Passing it for a changed range
  // would seed that key with the initial range's figures and skip the refetch.
  const isInitialRange =
    dateRange.from.getTime() === initialDateRange.from.getTime() &&
    dateRange.to.getTime() === initialDateRange.to.getTime();

  return (
    <section className="section flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-2 py-6">
        <h2 className="text-xl font-bold">Overview</h2>
        <div className="flex items-center gap-3">
          <DateRangePicker
            onUpdate={(values) => {
              const { from, to } = values.range;
              if (!from || !to) return;

              if (differenceInDays(to, from) > MAX_DATE_RANGE) {
                toast.error(
                  `The selected date range is too big. Choose a range of ${MAX_DATE_RANGE} days or less.`,
                );
                return;
              }
              setDateRange({ from, to });
            }}
            maxRangeDays={MAX_DATE_RANGE}
          />
        </div>
      </div>

      <div className="flex w-full flex-col gap-6">
        <StatsCards
          walletId={walletId}
          currency={currency}
          from={dateRange.from}
          to={dateRange.to}
          initialData={isInitialRange ? initialStats : undefined}
        />

        <CategoriesStats
          walletId={walletId}
          currency={currency}
          from={dateRange.from}
          to={dateRange.to}
          initialData={isInitialRange ? initialCategories : undefined}
        />
      </div>
    </section>
  );
};

export default OverviewClient;
