"use server";

import type {
  RemoveMemberSchemaType,
  SetEmailDigestSchemaType,
  SetMemberRoleSchemaType,
} from "@/schemas/membership";
import type { HouseholdMembership } from "@prisma/client";

import { redirect } from "next/navigation";

import {
  type ActionResult,
  fail,
  ok,
  withHouseholdAction,
} from "@/lib/action-result";
import { VIEW_ONLY_ROLE } from "@/lib/constants";
import {
  clearActiveHouseholdCookie,
  requireHousehold,
  setActiveHouseholdCookie,
} from "@/lib/household";
import { firstIssueMessage } from "@/lib/issue-message";
import {
  listMembers as listMembersSeam,
  removeMember as removeMemberSeam,
  setMemberRole as setMemberRoleSeam,
} from "@/lib/members";
import { notify, notifyHouseholdExcept } from "@/lib/notifications";
import prisma from "@/lib/prisma";
import { SetEmailDigestSchema } from "@/schemas/membership";

export async function listMembers() {
  return withHouseholdAction(
    "Unable to load the members. Refresh the page and try again.",
    ({ household }) => listMembersSeam(household.id),
  );
}

export async function leaveHousehold(): Promise<ActionResult> {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  const { session, household } = result;

  await prisma.$transaction(async (tx) => {
    await tx.householdMembership.delete({
      where: {
        householdId_userId: {
          householdId: household.id,
          userId: session.user.id,
        },
      },
    });

    await tx.apiToken.updateMany({
      where: {
        householdId: household.id,
        userId: session.user.id,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    const remaining = await tx.householdMembership.count({
      where: {
        householdId: household.id,
      },
    });

    if (remaining === 0) {
      await tx.household.delete({
        where: {
          id: household.id,
        },
      });
    }
  });

  const remainingMemberships = await prisma.householdMembership.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      joinedAt: "asc",
    },
    select: {
      householdId: true,
    },
  });
  if (remainingMemberships[0]) {
    await setActiveHouseholdCookie(remainingMemberships[0].householdId);
  } else {
    await clearActiveHouseholdCookie();
  }

  await notifyHouseholdExcept(
    household.id,
    session.user.id,
    "member_left",
    `${session.user.name} left the household.`,
  );

  redirect("/");
}

export async function removeMember(
  form: RemoveMemberSchemaType,
): Promise<ActionResult> {
  return withHouseholdAction(
    "Unable to remove this member. Try again.",
    async ({ household, session, membership }) => {
      const removedName = await removeMemberSeam(
        household.id,
        session.user.id,
        membership.role,
        form,
      );

      // The removed member now belongs to a different household, so their bell
      // would never show this; only the remaining members are notified.
      await notifyHouseholdExcept(
        household.id,
        session.user.id,
        "member_left",
        `${removedName} was removed from the household.`,
      );
    },
  );
}

export async function setMemberRole(
  form: SetMemberRoleSchemaType,
): Promise<ActionResult> {
  return withHouseholdAction(
    "Unable to change this member's access. Try again.",
    async ({ household, session, membership }) => {
      const { role: nextRole } = await setMemberRoleSeam(
        household.id,
        session.user.id,
        membership.role,
        form,
      );

      await notify(
        household.id,
        form.userId,
        "member_role",
        nextRole === VIEW_ONLY_ROLE
          ? `${session.user.name} set your access to view-only in this household.`
          : `${session.user.name} gave you full edit access in this household.`,
      );
    },
  );
}

export async function setEmailDigest(
  form: SetEmailDigestSchemaType,
): Promise<ActionResult<HouseholdMembership>> {
  const parsedBody = SetEmailDigestSchema.safeParse(form);
  if (!parsedBody.success) {
    return fail(
      firstIssueMessage(
        parsedBody.error.issues[0]?.message,
        "Unable to update the email digest. Try again.",
      ),
    );
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  const { session, household } = result;

  return ok(
    await prisma.householdMembership.update({
      where: {
        householdId_userId: {
          householdId: household.id,
          userId: session.user.id,
        },
      },
      data: {
        emailDigest: parsedBody.data.emailDigest,
      },
    }),
  );
}
