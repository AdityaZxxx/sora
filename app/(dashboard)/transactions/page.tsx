import { HydrationBoundary } from "@tanstack/react-query";
import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CACHE_RESOURCE, householdTag } from "@/lib/cache";
import {
  DEFAULT_CURRENCY,
  TRANSACTION_HISTORY_INITIAL_PAGE_SIZE,
} from "@/lib/constants";
import { resolveDateRange, utcDateValue } from "@/lib/dates";
import { requireHousehold } from "@/lib/household";
import { seedQuery, seededHydrationState } from "@/lib/hydration";
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
  const values = {
    from: utcDateValue(dateRange.from),
    to: utcDateValue(dateRange.to),
  };
  const pageSize = TRANSACTION_HISTORY_INITIAL_PAGE_SIZE;
  const page = await getTransactionsHistory(
    householdId,
    result.session.user.id,
    dateRange.from,
    dateRange.to,
    { limit: pageSize },
  );

  const state = await seededHydrationState(
    [
      seedQuery(
        queryKeys.transactions.history(values.from, values.to, pageSize),
        { pages: [page], pageParams: [null] },
        true,
      ),
    ],
    [householdTag(householdId, CACHE_RESOURCE.transactions)],
  );

  return (
    <HydrationBoundary state={state}>
      <TransactionsClient
        currency={result.household.currency ?? DEFAULT_CURRENCY}
        initialDateRange={values}
      />
    </HydrationBoundary>
  );
};

export default TransactionsPage;
