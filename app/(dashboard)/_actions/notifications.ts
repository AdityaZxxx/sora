"use server";

import { withHouseholdAction } from "@/lib/action-result";
import { CACHE_RESOURCE, revalidateHousehold } from "@/lib/cache";
import { markNotificationsRead } from "@/lib/notifications";

export async function markAllRead() {
  return withHouseholdAction(
    "Unable to mark the notifications as read. Refresh the page and try again.",
    async ({ household, session }) => {
      await markNotificationsRead(household.id, session.user.id);
      revalidateHousehold(household.id, [CACHE_RESOURCE.notifications]);
    },
  );
}
