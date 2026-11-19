"use client";
import type { TransactionType } from "@/lib/types";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { TrendingDown, TrendingUp } from "lucide-react";

import CategoryIcon from "@/components/CategoryIcon";
import SkeletonWrapper from "@/components/SkeletonWrapper";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import EmptyState from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { POLL_INTERVAL, DEFAULT_CURRENCY } from "@/lib/constants";
import { getFormatterForCurrency } from "@/lib/helpers";
import { queryKeys } from "@/lib/query-keys";

import { type GetCategoriesStatsResponseType } from "../../api/stats/categories/route";

interface CategoriesCardProps {
  formatter: { format: (value: number) => string };
  type: TransactionType;
  data: GetCategoriesStatsResponseType;
  total: number;
}

interface Props {
  from: Date;
  to: Date;
  currency: string | null;
}

const CategoriesStats = ({ from, to, currency }: Props) => {
  const statsQuery = useQuery<GetCategoriesStatsResponseType>({
    queryKey: queryKeys.overview.categories(from, to),
    queryFn: async () => {
      const response = await fetch(
        `/api/stats/categories?from=${format(from, "yyyy-MM-dd")}&to=${format(
          to,
          "yyyy-MM-dd",
        )}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch categories stats");
      }
      return response.json();
    },
    staleTime: POLL_INTERVAL,
    refetchInterval: POLL_INTERVAL,
    refetchOnWindowFocus: true,
  });

  const formatter = getFormatterForCurrency(currency ?? DEFAULT_CURRENCY);

  const stats = statsQuery.data || [];
  const incomeData = stats.filter((d) => d.type === "income");
  const expenseData = stats.filter((d) => d.type === "expense");

  const totalIncome = incomeData.reduce(
    (sum, d) => sum + (d._sum.amount || 0),
    0,
  );
  const totalExpense = expenseData.reduce(
    (sum, d) => sum + (d._sum.amount || 0),
    0,
  );

  const incomeStats = { data: incomeData, total: totalIncome };
  const expenseStats = { data: expenseData, total: totalExpense };

  return (
    <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
      <SkeletonWrapper isLoading={statsQuery.isLoading}>
        <CategoriesCard
          formatter={formatter}
          type="income"
          data={incomeStats.data}
          total={incomeStats.total}
        />
      </SkeletonWrapper>
      <SkeletonWrapper isLoading={statsQuery.isLoading}>
        <CategoriesCard
          formatter={formatter}
          type="expense"
          data={expenseStats.data}
          total={expenseStats.total}
        />
      </SkeletonWrapper>
    </div>
  );
};

export default CategoriesStats;

function CategoriesCard({ data, type, formatter, total }: CategoriesCardProps) {
  return (
    <Card className="flex h-88 w-full flex-col transition-all hover:shadow-md">
      <CardHeader>
        <CardTitle className="text-lg">
          {type === "income" ? "Incomes by category" : "Expenses by category"}
        </CardTitle>
      </CardHeader>
      <div className="flex-1 overflow-hidden">
        {data.length === 0 && (
          <EmptyState
            icon={type === "income" ? TrendingUp : TrendingDown}
            hint={`No data for the selected period. Try a different period or add new ${type}s.`}
          />
        )}
        {data.length > 0 && (
          <ScrollArea className="h-full px-4">
            <div className="flex flex-col gap-4 p-1">
              {data.map((item) => {
                const amount = item._sum.amount || 0;
                const percentage = total > 0 ? (amount * 100) / total : 0;
                return (
                  <div
                    key={`${item.category}-${item.categoryIconKind}-${item.categoryIcon}-${item.categoryIconColor}`}
                    className="flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CategoryIcon
                          icon={item.categoryIcon}
                          iconKind={item.categoryIconKind}
                          iconColor={item.categoryIconColor}
                          className="size-4 text-base"
                        />
                        {item.category}
                      </span>
                      <span className="text-sm font-semibold text-foreground tabular-nums">
                        {formatter.format(amount)}
                      </span>
                    </div>
                    <Progress
                      value={percentage}
                      aria-label={`${item.category} share`}
                      indicatorClassName={
                        type === "income" ? "bg-income" : "bg-expense"
                      }
                    />
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>
    </Card>
  );
}
