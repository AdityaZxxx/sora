"use server";

import type { Household } from "@prisma/client";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { fail, ok, type ActionResult } from "@/lib/action-result";
import { DomainError } from "@/lib/errors";
import { requireHousehold, updateHouseholdCurrency } from "@/lib/household";
import { firstIssueMessage } from "@/lib/issue-message";
export async function UpdateUserCurrency(
  currency: string,
): Promise<ActionResult<Household>> {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  try {
    const household = await updateHouseholdCurrency(
      result.household.id,
      currency,
      result.membership.role,
    );

    // The currency is passed to the dashboard as a server-rendered prop, so the
    // pages that render it have to be re-rendered with the new value.
    revalidatePath("/", "layout");

    return ok(household);
  } catch (cause) {
    if (cause instanceof DomainError) {
      return fail(
        firstIssueMessage(
          cause.message,
          "That currency is not supported. Choose one from the list.",
        ),
      );
    }
    throw cause;
  }
}
