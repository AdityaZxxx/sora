"use client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Handshake, Users } from "lucide-react";

import AddIconButton from "@/components/ui/add-icon-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import EmptyState from "@/components/ui/empty-state";
import { useActiveWallet } from "@/hooks/use-wallets";
import { QUERY_STALE_TIME, DEFAULT_CURRENCY } from "@/lib/constants";
import { fetchReadJson } from "@/lib/fetch-json";
import { getFormatterForCurrency } from "@/lib/helpers";
import { moneyNumber, toMoney } from "@/lib/money";
import { queryKeys } from "@/lib/query-keys";
import { MemberBalancesSchema, type MemberBalance } from "@/schemas/balances";

import RecordSettlementDialog from "./RecordSettlementDialog";

interface Props {
  currency: string | null;
  canEdit?: boolean;
  initialBalances?: MemberBalance[];
}

const Balances = ({ currency, canEdit = true, initialBalances }: Props) => {
  const formatter = getFormatterForCurrency(currency ?? DEFAULT_CURRENCY);
  const { data: wallets } = useActiveWallet();
  const walletId = wallets?.active.id ?? "";

  const { data: balances = [] } = useSuspenseQuery<MemberBalance[]>({
    queryKey: queryKeys.balances(walletId),
    initialData: initialBalances,
    queryFn: () =>
      fetchReadJson("/api/balances", "Failed to fetch balances", {
        schema: MemberBalancesSchema,
      }),
    staleTime: QUERY_STALE_TIME,
    refetchOnWindowFocus: true,
  });

  return (
    <Card className="h-full transition-all hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-lg">Balances</CardTitle>
            <CardDescription>
              Net amounts from expenses and settlements. No money moves inside
              the app.
            </CardDescription>
          </div>
          {canEdit ? (
            <RecordSettlementDialog
              currency={currency}
              members={balances.map(({ userId, name }) => ({ userId, name }))}
              trigger={
                <AddIconButton
                  label="Record settlement"
                  variant="outline"
                  icon={<Handshake aria-hidden="true" className="h-4 w-4" />}
                  disabled={balances.length === 0}
                />
              }
            />
          ) : undefined}
        </div>
      </CardHeader>
      <CardContent>
        {balances.length === 0 ? (
          <EmptyState
            icon={Users}
            hint="No other members yet. Invite someone to start splitting shared expenses."
          />
        ) : (
          <div className="space-y-2">
            {balances.map((balance) => (
              <div
                key={balance.userId}
                className="flex items-center justify-between gap-2 rounded-lg border p-4"
              >
                <span className="text-sm font-medium">{balance.name}</span>
                {toMoney(balance.balance).isZero() ? (
                  <span className="text-sm text-muted-foreground">
                    All settled up
                  </span>
                ) : toMoney(balance.balance).gt(0) ? (
                  <span className="text-sm font-semibold text-expense-foreground tabular-nums">
                    You owe {formatter.format(moneyNumber(balance.balance))}
                  </span>
                ) : (
                  <span className="text-sm font-semibold text-income-foreground tabular-nums">
                    {balance.name} owes you{" "}
                    {formatter.format(-moneyNumber(balance.balance))}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Balances;
