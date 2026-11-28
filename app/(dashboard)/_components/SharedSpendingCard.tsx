"use client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, Users } from "lucide-react";

import AnimatedNumber from "@/components/AnimatedNumber";
import { Card } from "@/components/ui/card";
import { useActiveWallet } from "@/hooks/use-wallets";
import { QUERY_STALE_TIME, DEFAULT_CURRENCY } from "@/lib/constants";
import { fetchReadJson } from "@/lib/fetch-json";
import {
  getFormatterForCurrency,
  getNumberFlowCurrencyProps,
} from "@/lib/helpers";
import { moneyNumber, toMoney } from "@/lib/money";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

import { type GetSharedSpendingResponseType } from "../../api/stats/shared-spending/route";

interface Props {
  currency: string | null;
}

const SharedSpendingCard = ({ currency }: Props) => {
  const { data: wallets } = useActiveWallet();
  const walletId = wallets?.active.id ?? "";
  const { data: spending } = useSuspenseQuery<GetSharedSpendingResponseType>({
    queryKey: queryKeys.sharedSpending(walletId),
    queryFn: () =>
      fetchReadJson<GetSharedSpendingResponseType>(
        "/api/stats/shared-spending",
        "Failed to fetch shared spending",
      ),
    staleTime: QUERY_STALE_TIME,
    refetchOnWindowFocus: true,
  });

  const formatter = getFormatterForCurrency(currency ?? DEFAULT_CURRENCY);
  const currencyFlow = getNumberFlowCurrencyProps(currency ?? DEFAULT_CURRENCY);

  const { thisMonth = "0", lastMonth = "0" } = spending;
  const difference = toMoney(thisMonth).minus(lastMonth);
  const isUp = difference.gte(0);
  const TrendIcon = isUp ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="section">
      <Card className="w-full p-6 transition-all hover:shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-lg bg-primary/10 p-3">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Shared spending this month
              </p>
              <AnimatedNumber
                value={moneyNumber(thisMonth)}
                {...currencyFlow}
                className="text-xl font-bold text-foreground tabular-nums"
              />
            </div>
          </div>
          <div
            className={cn(
              "flex items-center gap-1 text-sm",
              isUp ? "text-expense-foreground" : "text-income-foreground",
            )}
          >
            <TrendIcon className="h-4 w-4" />
            <span className="tabular-nums">
              {formatter.format(moneyNumber(difference.abs()))}{" "}
              {isUp ? "more" : "less"} than last month (
              {formatter.format(moneyNumber(lastMonth))})
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SharedSpendingCard;
