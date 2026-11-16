"use server";

import { withHouseholdAction } from "@/lib/action-result";
import { countHouseholdMembers } from "@/lib/household";

export async function getHouseholdMemberCount() {
  return withHouseholdAction(
    "Unable to load the household. Refresh the page and try again.",
    ({ household }) => countHouseholdMembers(household.id),
  );
}
