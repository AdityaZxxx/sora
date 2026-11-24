import { HydrationBoundary } from "@tanstack/react-query";

import Navbar from "@/components/Navbar";
import { CACHE_RESOURCE, householdTag } from "@/lib/cache";
import { listHouseholdsForMember, requireHousehold } from "@/lib/household";
import { seededHydrationState } from "@/lib/hydration";
import { listNotifications } from "@/lib/notifications";
import { queryKeys } from "@/lib/query-keys";

const SeededNavbar = async () => {
  const result = await requireHousehold();
  if (!result) {
    return <Navbar />;
  }

  const householdId = result.household.id;
  const userId = result.session.user.id;
  const [households, notifications] = await Promise.all([
    listHouseholdsForMember(userId, householdId),
    listNotifications(householdId, userId),
  ]);

  const state = await seededHydrationState(
    [
      { queryKey: queryKeys.households, data: households },
      { queryKey: queryKeys.notifications, data: notifications },
    ],
    [
      householdTag(householdId, CACHE_RESOURCE.household),
      householdTag(householdId, CACHE_RESOURCE.members),
      householdTag(householdId, CACHE_RESOURCE.notifications),
    ],
  );

  return (
    <HydrationBoundary state={state}>
      <Navbar />
    </HydrationBoundary>
  );
};

export default SeededNavbar;
