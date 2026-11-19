import { type Metadata } from "next";
import { redirect } from "next/navigation";

import { DEFAULT_CURRENCY } from "@/lib/constants";
import { requireHousehold } from "@/lib/household";

import TransactionsClient from "./_components/TransactionsClient";

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

export default async function TransactionsPage() {
  const result = await requireHousehold();
  if (!result) {
    redirect("/wizard");
  }

  return (
    <TransactionsClient
      currency={result.household.currency ?? DEFAULT_CURRENCY}
    />
  );
}
