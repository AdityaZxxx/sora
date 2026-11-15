"use server";

import { redirect } from "next/navigation";

import { ok, fail } from "@/lib/action-result";
import { DomainError } from "@/lib/errors";
import { requireHousehold } from "@/lib/household";
import { firstIssueMessage } from "@/lib/issue-message";
import prisma from "@/lib/prisma";

export async function getHouseholdMemberCount() {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  try {
    return ok(
      await prisma.householdMembership.count({
        where: {
          householdId: result.household.id,
        },
      }),
    );
  } catch (cause) {
    if (cause instanceof DomainError) {
      return fail(
        firstIssueMessage(
          cause.message,
          "Unable to load the household. Refresh the page and try again.",
        ),
      );
    }
    throw cause;
  }
}
