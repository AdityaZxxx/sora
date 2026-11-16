"use client";

import type { GetInsightsResponseType } from "../../api/insights/route";

import { useQuery } from "@tanstack/react-query";
import { HandCoins } from "lucide-react";
import dynamic from "next/dynamic";

import AnimatedNumber from "@/components/AnimatedNumber";
import SkeletonWrapper from "@/components/SkeletonWrapper";
import AddIconButton from "@/components/ui/add-icon-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import EmptyState from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { POLL_INTERVAL, DEFAULT_CURRENCY } from "@/lib/constants";
import { getFormatterForCurrency } from "@/lib/helpers";
import { cn } from "@/lib/utils";

const TrendChart = dynamic(() => import("./InsightsTrendChart"), {
  ssr: false,
  loading: () => <Skeleton className="h-48 w-full" />,
});

import CreateTransactionDialog from "./CreateTransactionDialog";

interface Props {
  currency: string | null;
}

const monthLong = (year: number, month: number) =>
  new Date(Date.UTC(year, month, 1)).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  });

const previousMonthLabel = (previous?: { year: number; month: number }) =>
  previous
    ? new Date(Date.UTC(previous.year, previous.month, 1)).toLocaleDateString(
        "en-US",
        { timeZone: "UTC", month: "long" },
      )
    : "last month";

const EMPTY_MONTHS: GetInsightsResponseType = [];

const rateFor = (bucket?: { income: number; expense: number }) =>
  bucket && bucket.income > 0
    ? (bucket.income - bucket.expense) / bucket.income
    : undefined;

const Insights = ({ currency }: Props) => {
  const formatter = getFormatterForCurrency(currency ?? DEFAULT_CURRENCY);

  const { data: queryMonths, isLoading } = useQuery<GetInsightsResponseType>({
    queryKey: ["insights"],
    queryFn: async () => {
      const response = await fetch("/api/insights");
      if (!response.ok) {
        throw new Error("Failed to fetch insights");
      }
      return response.json();
    },
    staleTime: POLL_INTERVAL,
    refetchInterval: POLL_INTERVAL,
    refetchOnWindowFocus: true,
  });

  const months = queryMonths ?? EMPTY_MONTHS;

  const hasAnyData = months.some(
    (bucket) => bucket.income > 0 || bucket.expense > 0,
  );

  if (!isLoading && !hasAnyData) {
    return (
      <div className="section">
        <Card className="transition-all hover:shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-lg">Savings rate</CardTitle>
              <CreateTransactionDialog
                type="expense"
                trigger={<AddIconButton label="Add a transaction" />}
              />
            </div>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={HandCoins}
              hint="Add your first transaction to see your savings rate."
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const current = months.at(-1);
  const previous = months.at(-2);
  const currentRate = rateFor(current);
  const previousRate = rateFor(previous);
  const deltaPt =
    currentRate !== undefined && previousRate !== undefined
      ? Math.round((currentRate - previousRate) * 100)
      : undefined;

  const rateColor =
    currentRate === undefined || currentRate === 0
      ? "text-muted-foreground"
      : currentRate > 0
        ? "text-income-foreground"
        : "text-expense-foreground";

  return (
    <div className="section grid gap-4 lg:grid-cols-3">
      <Card className="flex flex-col justify-center transition-all hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Savings rate</CardTitle>
          <CardDescription>
            {current ? monthLong(current.year, current.month) : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-1">
          <div
            aria-label={
              currentRate === undefined
                ? "Savings rate undefined: no income this month"
                : `Savings rate ${Math.round(currentRate * 100)} percent`
            }
          >
            {currentRate === undefined ? (
              <span
                aria-hidden="true"
                className="text-3xl font-bold text-muted-foreground"
              >
                –
              </span>
            ) : (
              <AnimatedNumber
                value={currentRate}
                format={{ style: "percent", maximumFractionDigits: 0 }}
                className={cn("text-3xl font-bold tabular-nums", rateColor)}
              />
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {deltaPt === undefined ? (
              <span className="tabular-nums">– pt</span>
            ) : (
              <span
                className={cn(
                  "tabular-nums",
                  deltaPt >= 0
                    ? "text-income-foreground"
                    : "text-expense-foreground",
                )}
              >
                {deltaPt >= 0 ? "+" : "-"}
                {Math.abs(deltaPt)} pt
              </span>
            )}{" "}
            vs {previousMonthLabel(previous)}
          </p>
        </CardContent>
      </Card>

      <Card className="transition-all hover:shadow-md lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">Income vs expense</CardTitle>
          <CardDescription>Last six months</CardDescription>
        </CardHeader>
        <CardContent>
          <SkeletonWrapper isLoading={isLoading}>
            <div className="h-44 w-full">
              <TrendChart months={months} formatter={formatter} />
            </div>
          </SkeletonWrapper>
        </CardContent>
      </Card>
    </div>
  );
};

export default Insights;
