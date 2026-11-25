"use client";

import { differenceInDays } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

import { DateRangePicker } from "@/components/ui/date-range-picker";
import { MAX_DATE_RANGE } from "@/lib/constants";
import { type DateRangeValues, formatDateValue } from "@/lib/dates";

import TransactionTable from "./TransactionTable";

const TransactionsClient = ({
  currency,
  initialDateRange,
}: {
  currency: string;
  initialDateRange: DateRangeValues;
}) => {
  const [dateRange, setDateRange] = useState<DateRangeValues>(
    () => initialDateRange,
  );
  return (
    <div className="min-h-screen bg-background">
      <header className="container pt-6">
        <div className="rounded-xl border bg-card px-6 py-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight">
                Transactions
              </h1>
              <p className="text-muted-foreground">
                Search, filter, and export your income and expenses.
              </p>
            </div>

            <DateRangePicker
              initialDateFrom={dateRange.from}
              initialDateTo={dateRange.to}
              maxRangeDays={MAX_DATE_RANGE}
              onUpdate={(values) => {
                const { from, to } = values.range;
                if (!from || !to) return;
                if (differenceInDays(to, from) > MAX_DATE_RANGE) {
                  toast.error(
                    `The selected date range is too big. Choose a range of ${MAX_DATE_RANGE} days or less.`,
                  );
                  return;
                }
                setDateRange({
                  from: formatDateValue(from),
                  to: formatDateValue(to),
                });
              }}
            />
          </div>
        </div>
      </header>
      <div className="container py-8">
        <TransactionTable
          key={`${dateRange.from}-${dateRange.to}`}
          from={dateRange.from}
          to={dateRange.to}
          currency={currency}
        />
      </div>
    </div>
  );
};

export default TransactionsClient;
