"use client";
import type { ReactNode } from "react";

import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useState } from "react";

import AnimatedNumber from "@/components/AnimatedNumber";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBalanceStats } from "@/hooks/use-balance-stats";
import { DEFAULT_CURRENCY } from "@/lib/constants";
import { getNumberFlowCurrencyProps } from "@/lib/helpers";

interface Props {
  walletId: string;
  from: Date;
  to: Date;
  currency: string | null;
}

const StatsCards = ({ walletId, from, to, currency }: Props) => {
  const { data, isPending } = useBalanceStats(walletId, from, to);

  const currencyFlow = getNumberFlowCurrencyProps(currency ?? DEFAULT_CURRENCY);

  if (isPending) {
    return <Skeleton className="h-32 w-full" />;
  }

  const { income = 0, expense = 0, net = 0 } = data ?? {};

  return (
    <div className="space-y-4">
      <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          currencyFlow={currencyFlow}
          value={income}
          title="Income"
          trend="up"
          icon={
            <div className="flex items-center justify-center rounded-lg bg-income-soft p-3">
              <TrendingUp className="h-6 w-6 text-income-foreground" />
            </div>
          }
        />
        <StatCard
          currencyFlow={currencyFlow}
          value={expense}
          title="Expense"
          trend="down"
          icon={
            <div className="flex items-center justify-center rounded-lg bg-expense-soft p-3">
              <TrendingDown className="h-6 w-6 text-expense-foreground" />
            </div>
          }
        />
        <StatCard
          currencyFlow={currencyFlow}
          value={net}
          title="Balance"
          trend={net >= 0 ? "up" : "down"}
          icon={
            <div className="flex items-center justify-center rounded-lg bg-primary/10 p-3">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
          }
        />
      </div>
    </div>
  );
};

export default StatsCards;

interface StatCardProps {
  currencyFlow: ReturnType<typeof getNumberFlowCurrencyProps>;
  value: number;
  title: string;
  icon: ReactNode;
  trend?: "up" | "down";
}

function StatCard({ currencyFlow, value, title, icon, trend }: StatCardProps) {
  const trendColor =
    trend === "up" ? "text-income-foreground" : "text-expense-foreground";
  const trendBg = trend === "up" ? "bg-income-soft" : "bg-expense-soft";

  const [today] = useState(() => new Date());

  return (
    <Card className="flex h-full flex-col p-6 transition-all hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon}
          <span className="text-sm font-medium text-muted-foreground">
            {title}
          </span>
        </div>
        {trend && (
          <span
            className={`rounded-full px-2 py-1 text-xs ${trendBg} ${trendColor}`}
          >
            {trend === "up" ? "+" : "-"}
          </span>
        )}
      </div>

      <div className="mt-4">
        <AnimatedNumber
          value={value}
          {...currencyFlow}
          className="text-xl font-bold text-foreground tabular-nums"
        />
      </div>

      <div className="mt-2 text-xs text-muted-foreground">
        {today.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </div>
    </Card>
  );
}
