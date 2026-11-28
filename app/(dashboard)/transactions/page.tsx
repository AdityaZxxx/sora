import { HydrationBoundary } from "@tanstack/react-query";
import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { DEFAULT_CURRENCY } from "@/lib/constants";
import { resolveDateRange, utcDateValue } from "@/lib/dates";
import {
  hydrationStateFor,
  seedContextFor,
  seededReads,
} from "@/lib/seeded-reads";
import { requireWallet } from "@/lib/wallet";

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
  const result = await requireWallet();
  if (!result) {
    notFound();
  }

  const dateRange = resolveDateRange();
  const values = {
    from: utcDateValue(dateRange.from),
    to: utcDateValue(dateRange.to),
  };
  const ctx = seedContextFor(
    result.wallet.id,
    result.session.user.id,
    dateRange,
  );
  const transactionsHistory = await seededReads.transactionsHistory.read(ctx);

  const state = await hydrationStateFor(["transactionsHistory"], ctx, {
    transactionsHistory,
  });

  return (
    <HydrationBoundary state={state}>
      <TransactionsClient
        currency={result.wallet.currency ?? DEFAULT_CURRENCY}
        initialDateRange={values}
      />
    </HydrationBoundary>
  );
};

export default TransactionsPage;
