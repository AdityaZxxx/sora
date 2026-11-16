"use server";

import type { Household } from "@prisma/client";

import { revalidatePath } from "next/cache";

import { type ActionResult, withHouseholdAction } from "@/lib/action-result";
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

      // The currency is passed to the dashboard as a server-rendered prop, so the
      // pages that render it have to be re-rendered with the new value.
      revalidatePath("/", "layout");

      return updated;
    },
  );
}
