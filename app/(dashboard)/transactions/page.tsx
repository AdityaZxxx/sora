import { HydrationBoundary } from "@tanstack/react-query";
import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CACHE_RESOURCE, householdTag } from "@/lib/cache";
import {
  DEFAULT_CURRENCY,
  TRANSACTION_HISTORY_INITIAL_PAGE_SIZE,
} from "@/lib/constants";
import { resolveDateRange } from "@/lib/dates";
import { requireHousehold } from "@/lib/household";
import { seededHydrationState } from "@/lib/hydration";
import { listMembers } from "@/lib/members";
import { queryKeys } from "@/lib/query-keys";
import { getTransactionsHistory } from "@/lib/transactions";

import TransactionsClient from "./_components/TransactionsClient";
import Loading from "./loading";

export const metadata: Metadata = {
  title: "Transaction History",
  description:
    "View, search, and filter all your transaction history. Keep a detailed record of your income and expenses.",

  keywords: [
    "transaction history",
    "financial records",
    "expense list",
    "income log",
    "budget records",
  ],

  openGraph: {
    description: "Keep a detailed record of your income and expenses.",
    url: "/transactions",
  },
  twitter: {
    description: "Keep a detailed record of your income and expenses.",
  },
};

export const instant = false;

const TransactionsPage = async () => {
  return (
    <Suspense fallback={<Loading />}>
      <SeededTransactions />
    </Suspense>
  );
};

const SeededTransactions = async () => {
  const result = await requireHousehold();
  if (!result) {
    notFound();
  }

  const householdId = result.household.id;
  const dateRange = resolveDateRange();
  const pageSize = TRANSACTION_HISTORY_INITIAL_PAGE_SIZE;
  const [page, members] = await Promise.all([
    getTransactionsHistory(
      householdId,
      result.session.user.id,
      dateRange.from,
      dateRange.to,
      { limit: pageSize },
    ),
    listMembers(householdId),
  ]);

  const state = await seededHydrationState(
    [
      {
        queryKey: queryKeys.transactions.history(
          dateRange.from,
          dateRange.to,
          pageSize,
        ),
        data: { pages: [page], pageParams: [null] },
        infinite: true,
      },
      { queryKey: queryKeys.householdMembers, data: members },
    ],
    [
      householdTag(householdId, CACHE_RESOURCE.transactions),
      householdTag(householdId, CACHE_RESOURCE.members),
    ],
  );

  return (
    <HydrationBoundary state={state}>
      <TransactionsClient
        currency={result.household.currency ?? DEFAULT_CURRENCY}
        initialDateRange={dateRange}
      />
    </HydrationBoundary>
  );
};

export default TransactionsPage;
