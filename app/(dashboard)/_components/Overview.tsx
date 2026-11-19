"use client";

import { differenceInDays } from "date-fns";
import { Suspense, useState } from "react";
import { toast } from "sonner";

import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { MAX_DATE_RANGE } from "@/lib/constants";

import CategoriesStats from "./CategoriesStats";
import StatsCards from "./StatsCards";

interface Props {
  currency: string | null;
  initialDateRange: { from: Date; to: Date };
}

const Overview = ({ currency, initialDateRange }: Props) => {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(
    () => initialDateRange,
  );
  return (
    <section className="section flex flex-col gap-4">
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

      <Suspense fallback={<Skeleton className="h-32 w-full" />}>
        <div className="flex w-full flex-col gap-4">
          <StatsCards
            currency={currency}
            from={dateRange.from}
            to={dateRange.to}
          />

          <CategoriesStats
            currency={currency}
            from={dateRange.from}
            to={dateRange.to}
          />
        </div>
      </Suspense>
    </section>
  );
};

export default Overview;
