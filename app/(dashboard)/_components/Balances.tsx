"use client";
import { useQuery } from "@tanstack/react-query";
import { Handshake, Users } from "lucide-react";

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
import { POLL_INTERVAL, DEFAULT_CURRENCY } from "@/lib/constants";
import { fetchJson } from "@/lib/fetch-json";
import { getFormatterForCurrency } from "@/lib/helpers";
import { queryKeys } from "@/lib/query-keys";
import { MemberBalancesSchema, type MemberBalance } from "@/schemas/balances";

import RecordSettlementDialog from "./RecordSettlementDialog";

interface Props {
  currency: string | null;
  canEdit?: boolean;
}

const Balances = ({ currency, canEdit = true }: Props) => {
  const formatter = getFormatterForCurrency(currency ?? DEFAULT_CURRENCY);

  const balancesQuery = useQuery<MemberBalance[]>({
    queryKey: queryKeys.balances,
    queryFn: () =>
      fetchJson(
        "/api/balances",
        MemberBalancesSchema,
        "Failed to fetch balances",
      ),
    staleTime: POLL_INTERVAL,
    refetchInterval: POLL_INTERVAL,
    refetchOnWindowFocus: true,
  });

  const balances = balancesQuery.data ?? [];

  return (
    <Card className="h-full transition-all hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-lg">Balances</CardTitle>
            <CardDescription>
              Net amounts from shared expenses and settlements. No money moves
              inside the app.
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
        <SkeletonWrapper isLoading={balancesQuery.isLoading}>
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
                  {balance.balance === 0 ? (
                    <span className="text-sm text-muted-foreground">
                      All settled up
                    </span>
                  ) : balance.balance > 0 ? (
                    <span className="text-sm font-semibold text-expense-foreground tabular-nums">
                      You owe {formatter.format(balance.balance)}
                    </span>
                  ) : (
                    <span className="text-sm font-semibold text-income-foreground tabular-nums">
                      {balance.name} owes you{" "}
                      {formatter.format(-balance.balance)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </SkeletonWrapper>
      </CardContent>
    </Card>
  );
};

export default Balances;
