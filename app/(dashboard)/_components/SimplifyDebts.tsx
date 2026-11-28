"use client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2 } from "lucide-react";

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
import { queryKeys } from "@/lib/query-keys";
import {
  SimplifiedTransfersSchema,
  type SimplifiedTransfer,
} from "@/schemas/balances";

interface Props {
  currency: string | null;
}

const SimplifyDebts = ({ currency }: Props) => {
  const formatter = getFormatterForCurrency(currency ?? DEFAULT_CURRENCY);
  const { data: wallets } = useActiveWallet();
  const walletId = wallets?.active.id ?? "";

  const { data: transfers = [] } = useSuspenseQuery<SimplifiedTransfer[]>({
    queryKey: queryKeys.simplifiedDebts(walletId),
    queryFn: () =>
      fetchReadJson(
        "/api/simplified-debts",
        "Failed to fetch simplified debts",
        {
          schema: SimplifiedTransfersSchema,
        },
      ),
    staleTime: QUERY_STALE_TIME,
    refetchOnWindowFocus: true,
  });

  return (
    <div className="section">
      <Card className="transition-all hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Simplify debts</CardTitle>
          <CardDescription>
            The fewest transfers that settle every balance. No money moves
            inside the app. Record a settlement you paid or received.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transfers.length === 0 ? (
            <CardContent>
              <EmptyState
                icon={CheckCircle2}
                hint="All settled up. No transfers needed right now."
              />
            </CardContent>
          ) : (
            <div className="space-y-2">
              {transfers.map((transfer) => (
                <div
                  key={`${transfer.fromUserId}-${transfer.toUserId}`}
                  className="flex items-center justify-between gap-2 rounded-lg border p-4"
                >
                  <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                    <span className="truncate">{transfer.fromName}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{transfer.toName}</span>
                  </span>
                  <span className="text-sm font-semibold tabular-nums">
                    {formatter.format(transfer.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SimplifyDebts;
