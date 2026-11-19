import { HydrationBoundary } from "@tanstack/react-query";
import { type Metadata } from "next";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";

import AddMemberCta from "./_components/AddMemberCta";
import Balances from "./_components/Balances";
import CreateTransactionDialog from "./_components/CreateTransactionDialog";
import Goals from "./_components/Goals";
import History from "./_components/History";
import Insights from "./_components/Insights";
import Overview from "./_components/Overview";
import SafeToSpend from "./_components/SafeToSpend";
import SharedSpendingCard from "./_components/SharedSpendingCard";
import SimplifyDebts from "./_components/SimplifyDebts";
import UpcomingBills from "./_components/UpcomingBills";
import {
  dashboardHydrationState,
  loadDashboard,
} from "./_lib/dashboard-loader";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Your personal dashboard to track income, expenses, and see a complete overview of your financial health.",

  robots: {
    index: false,
    follow: false,
  },
};

const DashboardPage = async () => {
  const payload = await loadDashboard();
  if (!payload) {
    redirect("/wizard");
  }

  const state = dashboardHydrationState(payload);
  const { userName, currency, canEdit, memberCount, dateRange, historyView } =
    payload;

  return (
    <HydrationBoundary state={state}>
      <div className="min-h-screen bg-background">
        <div className="container pt-6">
          <div className="rounded-xl border bg-card px-6 py-8">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <h1 className="text-2xl font-bold">
                Hello, {userName.split(" ")[0]}! 👋
              </h1>

              {canEdit && (
                <div className="flex items-center gap-3">
                  <CreateTransactionDialog
                    trigger={
                      <Button
                        variant="default"
                        className="bg-income-action text-white hover:bg-income-action-hover"
                      >
                        New income
                      </Button>
                    }
                    type="income"
                    currency={currency}
                    memberCount={memberCount}
                  />
                  <CreateTransactionDialog
                    trigger={
                      <Button
                        variant="default"
                        className="bg-expense-action text-white hover:bg-expense-action-hover"
                      >
                        New expense
                      </Button>
                    }
                    type="expense"
                    currency={currency}
                    memberCount={memberCount}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        {canEdit && <AddMemberCta memberCount={memberCount} />}
        <Overview currency={currency} initialDateRange={dateRange} />
        <Insights currency={currency} memberCount={memberCount} />
        <div className="section grid gap-4 lg:grid-cols-3">
          <SafeToSpend currency={currency} />
          <div className="lg:col-span-2">
            <UpcomingBills
              currency={currency}
              canEdit={canEdit}
              memberCount={memberCount}
            />
          </div>
        </div>
        {memberCount > 1 && <SharedSpendingCard currency={currency} />}
        <div
          className={
            memberCount > 1
              ? "section grid gap-4 lg:grid-cols-2"
              : "section grid gap-4"
          }
        >
          {memberCount > 1 && (
            <Balances currency={currency} canEdit={canEdit} />
          )}
          <Goals currency={currency} canEdit={canEdit} />
        </div>
        {memberCount > 2 && <SimplifyDebts currency={currency} />}
        <History
          currency={currency}
          initialTimeframe={historyView.timeframe}
          initialPeriod={historyView.period}
        />
      </div>
    </HydrationBoundary>
  );
};

export default DashboardPage;
