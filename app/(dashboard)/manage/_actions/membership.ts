"use server";

import type {
  RemoveMemberSchemaType,
  SetEmailDigestSchemaType,
  SetMemberRoleSchemaType,
} from "@/schemas/membership";
import type { HouseholdMembership } from "@prisma/client";

import { redirect } from "next/navigation";

import { type ActionResult, withHouseholdAction } from "@/lib/action-result";
import { CACHE_RESOURCE, revalidateHousehold } from "@/lib/cache";
import { VIEW_ONLY_ROLE } from "@/lib/constants";
import {
  clearActiveHouseholdCookie,
  firstHouseholdIdForUser,
  setActiveHouseholdCookie,
} from "@/lib/household";
import {
  leaveHousehold as leaveHouseholdSeam,
  listMembers as listMembersSeam,
  removeMember as removeMemberSeam,
  setEmailDigest as setEmailDigestSeam,
  setMemberRole as setMemberRoleSeam,
} from "@/lib/members";
import { notify, notifyHouseholdExcept } from "@/lib/notifications";

export async function listMembers() {
  return withHouseholdAction(
    "Unable to load the members. Refresh the page and try again.",
    ({ household }) => listMembersSeam(household.id),
  );
}

export async function leaveHousehold(): Promise<ActionResult> {
  return withHouseholdAction(
    "Unable to leave this household. Refresh the page and try again.",
    async ({ household, session }) => {
      await leaveHouseholdSeam(
        household.id,
        session.user.id,
        session.user.name,
      );
      revalidateHousehold(household.id, [
        CACHE_RESOURCE.members,
        CACHE_RESOURCE.household,
        CACHE_RESOURCE.balances,
      ]);

      const nextHouseholdId = await firstHouseholdIdForUser(session.user.id);
      if (nextHouseholdId) {
        await setActiveHouseholdCookie(nextHouseholdId);
      } else {
        await clearActiveHouseholdCookie();
      }

      redirect("/");
    },
  );
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

      await notifyHouseholdExcept(
        household.id,
        session.user.id,
        "member_left",
        `${removedName} was removed from the household.`,
      );
      revalidateHousehold(household.id, [
        CACHE_RESOURCE.members,
        CACHE_RESOURCE.household,
        CACHE_RESOURCE.balances,
        CACHE_RESOURCE.notifications,
      ]);
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
      revalidateHousehold(household.id, [
        CACHE_RESOURCE.members,
        CACHE_RESOURCE.notifications,
      ]);
    },
  );
}

export async function setEmailDigest(
  form: SetEmailDigestSchemaType,
): Promise<ActionResult<HouseholdMembership>> {
  return withHouseholdAction(
    "Unable to update the email digest. Try again.",
    async ({ household, session }) => {
      const updated = await setEmailDigestSeam(
        household.id,
        session.user.id,
        form,
      );
      revalidateHousehold(household.id, [CACHE_RESOURCE.members]);
      return updated;
    },
  );
}
