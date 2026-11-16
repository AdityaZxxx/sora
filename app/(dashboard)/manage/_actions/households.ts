"use server";

import type { Household } from "@prisma/client";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { type ActionResult, withHouseholdAction } from "@/lib/action-result";
import { getSession } from "@/lib/auth";
import {
  renameHousehold as renameHouseholdSeam,
  setActiveHouseholdCookie,
} from "@/lib/household";
import prisma from "@/lib/prisma";
import { parseHouseholdName } from "@/schemas/household";

export async function switchHousehold(householdId: string) {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }

  const membership = await prisma.householdMembership.findUnique({
    where: {
      householdId_userId: {
        householdId,
        userId: session.user.id,
      },
    },
  });

  if (!membership) {
    throw new Error(
      "You are not a member of that household. Ask for an invite link to join it.",
    );
  }

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

  const parsedName = parseHouseholdName(name);

  const household = await prisma.$transaction(async (tx) => {
    const created = await tx.household.create({
      data: {
        name: parsedName || null,
      },
    });
    await tx.householdMembership.create({
      data: {
        householdId: created.id,
        userId: session.user.id,
      },
    });
    return created;
  });

  await setActiveHouseholdCookie(household.id);
  revalidatePath("/", "layout");
  return household;
}
