import { HydrationBoundary } from "@tanstack/react-query";
import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { listApiTokens } from "@/lib/api-token";
import { getBudgetsWithProgress } from "@/lib/budgets";
import { CACHE_RESOURCE, householdTag } from "@/lib/cache";
import { getCategories } from "@/lib/categories";
import { listHouseholdsForMember, requireHousehold } from "@/lib/household";
import { seededHydrationState } from "@/lib/hydration";
import { listInviteLinks } from "@/lib/invites";
import { listMembers } from "@/lib/members";
import { queryKeys } from "@/lib/query-keys";

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
  const result = await requireHousehold();
  if (!result) {
    notFound();
  }

  const householdId = result.household.id;
  const [
    households,
    members,
    incomeCategories,
    expenseCategories,
    budgets,
    apiTokens,
    inviteLinks,
  ] = await Promise.all([
    listHouseholdsForMember(result.session.user.id, householdId),
    listMembers(householdId),
    getCategories(householdId, "income"),
    getCategories(householdId, "expense"),
    getBudgetsWithProgress(householdId),
    listApiTokens(householdId),
    listInviteLinks(householdId),
  ]);

  const state = await seededHydrationState(
    [
      { queryKey: queryKeys.households, data: households },
      { queryKey: queryKeys.householdMembers, data: members },
      { queryKey: queryKeys.categories("income"), data: incomeCategories },
      { queryKey: queryKeys.categories("expense"), data: expenseCategories },
      { queryKey: queryKeys.budgets, data: budgets },
      { queryKey: queryKeys.apiTokens, data: apiTokens },
      { queryKey: queryKeys.inviteLinks, data: inviteLinks },
    ],
    [
      householdTag(householdId, CACHE_RESOURCE.household),
      householdTag(householdId, CACHE_RESOURCE.members),
      householdTag(householdId, CACHE_RESOURCE.categories),
      householdTag(householdId, CACHE_RESOURCE.budgets),
      householdTag(householdId, CACHE_RESOURCE.apiTokens),
      householdTag(householdId, CACHE_RESOURCE.invites),
    ],
  );

  return (
    <HydrationBoundary state={state}>
      <ManagePageClient household={result.household} />
    </HydrationBoundary>
  );
};

export default ManagePage;
