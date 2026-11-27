import type { DashboardContext } from "../_lib/dashboard-context";

import { HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { loadDashboardState } from "../_lib/dashboard-loader";
import AddMemberCta from "./AddMemberCta";
import Balances from "./Balances";
import Goals from "./Goals";
import History from "./History";
import Insights from "./Insights";
import SafeToSpend from "./SafeToSpend";
import Settlements from "./Settlements";
import SharedSpendingCard from "./SharedSpendingCard";
import SimplifyDebts from "./SimplifyDebts";
import UpcomingBills from "./UpcomingBills";

interface Props {
  context: DashboardContext;
}

const DashboardSections = async ({ context }: Props) => {
  const { payload, state } = await loadDashboardState(context);
  const { currency, canEdit, canManage, memberCount } = payload;

  return (
    <HydrationBoundary state={state}>
      {canManage && <AddMemberCta memberCount={memberCount} />}
      <Suspense
        fallback={
          <Skeleton className="section h-64 w-full" aria-hidden="true" />
        }
      >
        <Insights currency={currency} memberCount={memberCount} />
      </Suspense>
      <div className="section grid gap-6 lg:grid-cols-3">
        <Suspense
          fallback={<Skeleton className="h-52 w-full" aria-hidden="true" />}
        >
          <SafeToSpend currency={currency} />
        </Suspense>
        <div className="lg:col-span-2">
          <Suspense
            fallback={<Skeleton className="h-52 w-full" aria-hidden="true" />}
          >
            <UpcomingBills
              currency={currency}
              canEdit={canEdit}
              memberCount={memberCount}
            />
          </Suspense>
        </div>
      </div>
      {memberCount > 1 && (
        <Suspense
          fallback={
            <Skeleton className="section h-40 w-full" aria-hidden="true" />
          }
        >
          <SharedSpendingCard currency={currency} />
        </Suspense>
      )}
      <div
        className={
          memberCount > 1
            ? "section grid gap-6 lg:grid-cols-2"
            : "section grid gap-6"
        }
      >
        {memberCount > 1 && (
          <Suspense
            fallback={<Skeleton className="h-56 w-full" aria-hidden="true" />}
          >
            <Balances currency={currency} canEdit={canEdit} />
          </Suspense>
        )}
        <Suspense
          fallback={<Skeleton className="h-56 w-full" aria-hidden="true" />}
        >
          <Goals currency={currency} canEdit={canManage} />
        </Suspense>
      </div>
      {memberCount > 2 && (
        <Suspense
          fallback={
            <Skeleton className="section h-40 w-full" aria-hidden="true" />
          }
        >
          <SimplifyDebts currency={currency} />
        </Suspense>
      )}
      <Settlements currency={currency} />
      <Suspense
        fallback={
          <Skeleton className="section h-80 w-full" aria-hidden="true" />
        }
      >
        <History
          walletId={context.walletId}
          currency={currency}
          initialTimeframe={payload.historyView.timeframe}
          initialPeriod={payload.historyView.period}
        />
      </Suspense>
    </HydrationBoundary>
  );
};

export default DashboardSections;
