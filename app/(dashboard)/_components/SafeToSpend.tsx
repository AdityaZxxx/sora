"use client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Wallet } from "lucide-react";

import AnimatedNumber from "@/components/AnimatedNumber";
import AddIconButton from "@/components/ui/add-icon-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import EmptyState from "@/components/ui/empty-state";
import { unwrapAction } from "@/lib/action-client";
import { POLL_INTERVAL, DEFAULT_CURRENCY } from "@/lib/constants";
import { getNumberFlowCurrencyProps } from "@/lib/helpers";
import { queryKeys } from "@/lib/query-keys";

import { listBudgets } from "../_actions/budgets";
import BudgetDialog from "../manage/_components/BudgetDialog";

interface Props {
  currency: string | null;
}

const SafeToSpend = ({ currency }: Props) => {
  const currencyFlow = getNumberFlowCurrencyProps(currency ?? DEFAULT_CURRENCY);

  const { data: budgets = [] } = useSuspenseQuery({
    queryKey: queryKeys.budgets,
    queryFn: async () => {
      return unwrapAction(await listBudgets());
    },
    staleTime: POLL_INTERVAL,
    refetchInterval: POLL_INTERVAL,
    refetchOnWindowFocus: true,
  });

  const remaining = budgets.reduce(
    (sum, budget) => sum + Math.max(0, budget.remaining),
    0,
  );

  return (
    <Card className="h-full transition-all hover:shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-lg">Safe to spend</CardTitle>
            <CardDescription>
              Left across your budgets this month
            </CardDescription>
          </div>
          {budgets.length === 0 ? (
            <BudgetDialog trigger={<AddIconButton label="Create a budget" />} />
          ) : undefined}
        </div>
      </CardHeader>
      {budgets.length === 0 ? (
        <CardContent>
          <EmptyState
            icon={Wallet}
            hint="Set your first budget and this figure tells you what is safe to spend."
          />
        </CardContent>
      ) : (
        <CardContent>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-income-soft p-3">
                <Wallet
                  aria-hidden="true"
                  className="h-6 w-6 text-income-foreground"
                />
              </div>
              <div>
                <AnimatedNumber
                  value={remaining}
                  {...currencyFlow}
                  className="text-3xl font-bold tabular-nums"
                />
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default SafeToSpend;
