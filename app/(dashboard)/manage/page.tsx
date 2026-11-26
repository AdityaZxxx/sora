import { HydrationBoundary } from "@tanstack/react-query";
import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { getBudgetsWithProgress } from "@/lib/budgets";
import { CACHE_RESOURCE, walletTag } from "@/lib/cache";
import { getCategories } from "@/lib/categories";
import { seedQuery, seededHydrationState } from "@/lib/hydration";
import { listInviteLinks } from "@/lib/invites";
import { queryKeys } from "@/lib/query-keys";
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

  const walletId = result.wallet.id;
  const [incomeCategories, expenseCategories, budgets, inviteLinks] =
    await Promise.all([
      getCategories(walletId, "income"),
      getCategories(walletId, "expense"),
      getBudgetsWithProgress(walletId),
      listInviteLinks(walletId),
    ]);

  const state = await seededHydrationState(
    [
      seedQuery(queryKeys.categories("income"), incomeCategories),
      seedQuery(queryKeys.categories("expense"), expenseCategories),
      seedQuery(queryKeys.budgets, budgets),
      seedQuery(queryKeys.inviteLinks, inviteLinks),
    ],
    [
      walletTag(walletId, CACHE_RESOURCE.categories),
      walletTag(walletId, CACHE_RESOURCE.budgets),
      walletTag(walletId, CACHE_RESOURCE.invites),
    ],
  );

  return (
    <HydrationBoundary state={state}>
      <ManagePageClient wallet={result.wallet} />
    </HydrationBoundary>
  );
};

export default ManagePage;
