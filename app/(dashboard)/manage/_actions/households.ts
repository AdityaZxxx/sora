"use server";

import type { Household } from "@prisma/client";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { type ActionResult, withHouseholdAction } from "@/lib/action-result";
import { getSession } from "@/lib/auth";
import {
  assertHouseholdMembership,
  createAdditionalHousehold,
  renameHousehold as renameHouseholdSeam,
  setActiveHouseholdCookie,
} from "@/lib/household";

export async function switchHousehold(householdId: string) {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }

  await assertHouseholdMembership(householdId, session.user.id);
  await setActiveHouseholdCookie(householdId);
  revalidatePath("/", "layout");
}

export async function renameHousehold(
  name: string,
): Promise<ActionResult<Household>> {
  return withHouseholdAction(
    "Unable to rename this space. Check the name and try again.",
    async ({ household, membership }) => {
      const renamed = await renameHouseholdSeam(
        household.id,
        name,
        membership.role,
      );
      revalidatePath("/", "layout");
      return renamed;
    },
  );
}

export async function createHousehold(name: string) {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }

  const household = await createAdditionalHousehold(session.user.id, name);

  await setActiveHouseholdCookie(household.id);
  revalidatePath("/", "layout");
  return household;
}
