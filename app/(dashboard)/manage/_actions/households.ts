"use server";

import type { Household } from "@prisma/client";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { type ActionResult, withHouseholdAction } from "@/lib/action-result";
import { getSession } from "@/lib/auth";
import { CACHE_RESOURCE, revalidateHousehold } from "@/lib/cache";
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
  revalidateHousehold(householdId, [CACHE_RESOURCE.household]);
  revalidatePath("/", "layout");
}

export async function renameHousehold(
  name: string,
): Promise<ActionResult<Household>> {
  return withHouseholdAction(
    "Unable to rename this space. Check the name and try again.",
    async ({ caller }) => {
      const renamed = await renameHouseholdSeam(caller, name);
      revalidateHousehold(caller.householdId, [CACHE_RESOURCE.household]);
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
  revalidateHousehold(household.id, [CACHE_RESOURCE.household]);
  revalidatePath("/", "layout");
  return household;
}
