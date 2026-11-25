import type { ReactNode } from "react";

import { HydrationBoundary } from "@tanstack/react-query";
import { cacheLife } from "next/cache";

import Navbar from "@/components/Navbar";
import { CACHE_RESOURCE, householdTag, memberHouseholdsTag } from "@/lib/cache";
import { cachedHouseholdsForMember, requireHousehold } from "@/lib/household";
import { seedQuery, seededHydrationState } from "@/lib/hydration";
import { listMembers } from "@/lib/members";
import { listNotifications } from "@/lib/notifications";
import { queryKeys } from "@/lib/query-keys";

const SeededDashboardShell = async ({ children }: { children: ReactNode }) => {
  "use cache: private";
  cacheLife({ stale: 300 });

  const result = await requireHousehold();
  if (!result) {
    return (
      <>
        <Navbar />
        {children}
      </>
    );
  }

  const householdId = result.household.id;
  const userId = result.session.user.id;
  const [households, notifications, members] = await Promise.all([
    cachedHouseholdsForMember(userId, householdId),
    listNotifications(householdId, userId),
    listMembers(householdId),
  ]);

  const state = await seededHydrationState(
    [
      seedQuery(queryKeys.households, households),
      seedQuery(queryKeys.notifications, notifications),
      seedQuery(queryKeys.householdMembers, members),
    ],
    [
      memberHouseholdsTag(userId),
      householdTag(householdId, CACHE_RESOURCE.household),
      householdTag(householdId, CACHE_RESOURCE.members),
      householdTag(householdId, CACHE_RESOURCE.notifications),
    ],
  );

  return (
    <HydrationBoundary state={state}>
      <Navbar />
      {children}
    </HydrationBoundary>
  );
};

export default SeededDashboardShell;
