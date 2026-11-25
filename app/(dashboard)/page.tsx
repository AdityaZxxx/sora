import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";

import CreateTransactionDialog from "./_components/CreateTransactionDialog";
import DashboardSections from "./_components/DashboardSections";
import {
  DashboardSectionsSkeleton,
  OverviewSkeleton,
} from "./_components/DashboardSkeletons";
import Overview from "./_components/Overview";
import { getDashboardContext } from "./_lib/dashboard-context";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Your personal dashboard to track income, expenses, and see a complete overview of your financial health.",

  robots: {
    index: false,
    follow: false,
  },
};

export const instant = true;

const DashboardPage = async () => {
  const context = await getDashboardContext();
  if (!context) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="container pt-6">
        <div className="rounded-xl border bg-card px-6 py-8">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <h1 className="text-2xl font-bold">
              Hello, {context.userName.split(" ")[0]}! 👋
            </h1>

            {context.canEdit && (
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
                  currency={context.currency}
                  memberCount={context.memberCount}
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
                  currency={context.currency}
                  memberCount={context.memberCount}
                />
              </div>
            )}
          </div>
        </div>
      </div>
      <Suspense fallback={<OverviewSkeleton />}>
        <Overview
          householdId={context.householdId}
          currency={context.currency}
          initialDateRange={context.dateRange}
        />
      </Suspense>
      <Suspense fallback={<DashboardSectionsSkeleton />}>
        <DashboardSections context={context} />
      </Suspense>
    </div>
  );
};

export default DashboardPage;
