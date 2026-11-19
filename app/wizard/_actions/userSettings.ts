"use server";

import type { Household } from "@prisma/client";

import { revalidatePath } from "next/cache";

import { type ActionResult, withHouseholdAction } from "@/lib/action-result";
import { CACHE_RESOURCE, revalidateHousehold } from "@/lib/cache";
import { updateHouseholdCurrency } from "@/lib/household";

export async function UpdateUserCurrency(
  currency: string,
): Promise<ActionResult<Household>> {
  return withHouseholdAction(
    "That currency is not supported. Choose one from the list.",
    async ({ household, membership }) => {
      const updated = await updateHouseholdCurrency(
        household.id,
        currency,
        membership.role,
      );

      revalidateHousehold(household.id, [CACHE_RESOURCE.household]);
      revalidatePath("/", "layout");

      return updated;
    },
  );
}
