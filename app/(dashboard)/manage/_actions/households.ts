"use server";

import type { Household } from "@prisma/client";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { type ActionResult, fail, ok } from "@/lib/action-result";
import { getSession } from "@/lib/auth";
import { DomainError } from "@/lib/errors";
import {
  renameHousehold as renameHouseholdSeam,
  requireHousehold,
  setActiveHouseholdCookie,
} from "@/lib/household";
import { firstIssueMessage } from "@/lib/issue-message";
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
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  try {
    const household = await renameHouseholdSeam(
      result.household.id,
      name,
      result.membership.role,
    );

    revalidatePath("/", "layout");
    return ok(household);
  } catch (cause) {
    if (cause instanceof DomainError) {
      return fail(
        firstIssueMessage(
          cause.message,
          "Unable to rename this space. Check the name and try again.",
        ),
      );
    }
    throw cause;
  }
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
