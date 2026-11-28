import { HydrationBoundary } from "@tanstack/react-query";
import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import {
  hydrationStateFor,
  seedContextFor,
  seededReads,
} from "@/lib/seeded-reads";
import { requireWallet } from "@/lib/wallet";

import ManagePageClient from "./_components/ManagePageClient";
import Loading from "./loading";

export const metadata: Metadata = {
  title: "Manage Settings",
  description:
    "Manage your account settings, default currency, and categories.",

  robots: {
    index: false,
    follow: false,
  },
};

export const instant = false;

const ManagePage = async () => {
  return (
    <Suspense fallback={<Loading />}>
      <SeededManage />
    </Suspense>
  );
};

const SeededManage = async () => {
  const result = await requireWallet();
  if (!result) {
    notFound();
  }

  const ctx = seedContextFor(result.wallet.id, result.session.user.id);
  const [incomeCategories, expenseCategories, budgets, inviteLinks] =
    await Promise.all([
      seededReads.incomeCategories.read(ctx),
      seededReads.expenseCategories.read(ctx),
      seededReads.manageBudgets.read(ctx),
      seededReads.inviteLinks.read(ctx),
    ]);

  const state = await hydrationStateFor(
    ["incomeCategories", "expenseCategories", "manageBudgets", "inviteLinks"],
    ctx,
    {
      incomeCategories,
      expenseCategories,
      manageBudgets: budgets,
      inviteLinks,
    },
  );

  return (
    <HydrationBoundary state={state}>
      <ManagePageClient wallet={result.wallet} />
    </HydrationBoundary>
  );
};

export default ManagePage;
