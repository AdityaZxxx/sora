"use client";

import type { SettlementRow } from "@/lib/settlements";

import { useQuery } from "@tanstack/react-query";
import { Handshake } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DEFAULT_CURRENCY, QUERY_STALE_TIME } from "@/lib/constants";
import { fetchReadJson } from "@/lib/fetch-json";
import { getFormatterForCurrency } from "@/lib/helpers";
import { queryKeys } from "@/lib/query-keys";

export default function Settlements({ currency }: { currency: string | null }) {
  const formatter = getFormatterForCurrency(currency ?? DEFAULT_CURRENCY);
  const { data: settlements = [], isLoading } = useQuery<SettlementRow[]>({
    queryKey: queryKeys.settlements,
    queryFn: () =>
      fetchReadJson<SettlementRow[]>(
        "/api/settlements",
        "Unable to load settlements. Refresh the page and try again.",
      ),
    staleTime: QUERY_STALE_TIME,
    refetchOnWindowFocus: true,
  });

  if (isLoading) {
    return <Skeleton className="section h-40 w-full" />;
  }
  if (settlements.length === 0) return null;

  return (
    <section className="section">
      <Card className="transition-all hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Settlements</CardTitle>
          <CardDescription>
            Payments members made outside Sora. Only the two involved members
            see the amount.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {settlements.map((settlement) => (
              <div
                key={settlement.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Handshake
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {!settlement.isParty
                        ? "A settlement was recorded"
                        : settlement.isPayer
                          ? `You paid ${settlement.receiverName}`
                          : `${settlement.payerName} paid you`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(settlement.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {settlement.isParty && settlement.amount !== null && (
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {formatter.format(settlement.amount)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
