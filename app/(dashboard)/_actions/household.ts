"use server";

import { withHouseholdAction } from "@/lib/action-result";
import prisma from "@/lib/prisma";

export async function getHouseholdMemberCount() {
  return withHouseholdAction(
    "Unable to load the household. Refresh the page and try again.",
    ({ household }) =>
      prisma.householdMembership.count({
        where: {
          householdId: household.id,
        },
      }),
  );
}
