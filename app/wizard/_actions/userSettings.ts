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
    async ({ caller }) => {
      const updated = await updateHouseholdCurrency(caller, currency);

      revalidateHousehold(caller.householdId, [CACHE_RESOURCE.household]);
      revalidatePath("/", "layout");

      return updated;
    },
  );
}
