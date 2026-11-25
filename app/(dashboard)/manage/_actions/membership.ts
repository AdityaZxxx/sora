"use server";

import type {
  SetEmailDigestSchemaType,
  SetMemberRoleSchemaType,
} from "@/schemas/membership";
import type { HouseholdMembership } from "@prisma/client";

import { redirect } from "next/navigation";

import { type ActionResult, withHouseholdAction } from "@/lib/action-result";
import { CACHE_RESOURCE, revalidateHousehold } from "@/lib/cache";
import { actorFor } from "@/lib/caller";
import { VIEW_ONLY_ROLE } from "@/lib/constants";
import {
  formText,
  fromActionResult,
  submitFormAction,
  type FormActionState,
} from "@/lib/form-action";
import {
  clearActiveHouseholdCookie,
  firstHouseholdIdForUser,
  setActiveHouseholdCookie,
} from "@/lib/household";
import {
  leaveHousehold as leaveHouseholdSeam,
  removeMember as removeMemberSeam,
  setEmailDigest as setEmailDigestSeam,
  setMemberRole as setMemberRoleSeam,
} from "@/lib/members";
import { notify, notifyHouseholdExcept } from "@/lib/notifications";
import { RemoveMemberSchema } from "@/schemas/membership";

const LEAVE_ERROR =
  "Unable to leave this household. Refresh the page and try again.";
const REMOVE_ERROR = "Unable to remove this member. Try again.";

export async function leaveHouseholdForm(
  _previous: FormActionState,
  _formData: FormData,
): Promise<FormActionState> {
  const result = await withHouseholdAction(LEAVE_ERROR, async ({ caller }) => {
    await leaveHouseholdSeam(caller);
    revalidateHousehold(caller.householdId, [
      CACHE_RESOURCE.members,
      CACHE_RESOURCE.household,
      CACHE_RESOURCE.balances,
    ]);

    const nextHouseholdId = await firstHouseholdIdForUser(caller.userId);
    if (nextHouseholdId) {
      await setActiveHouseholdCookie(nextHouseholdId);
    } else {
      await clearActiveHouseholdCookie();
    }

    redirect("/");
  });
  return fromActionResult(result, "You left the household");
}

export async function removeMemberForm(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  return submitFormAction({
    formData,
    fields: (data) => ({ userId: formText(data, "userId") }),
    schema: RemoveMemberSchema,
    fallback: REMOVE_ERROR,
    success: "Member removed from the household",
    run: (input) =>
      withHouseholdAction(REMOVE_ERROR, async ({ caller }) => {
        const removedName = await removeMemberSeam(caller, input);

        await notifyHouseholdExcept(
          actorFor(caller),
          caller.householdId,
          caller.userId,
          "member_left",
          `${removedName} was removed from the household.`,
        );
        revalidateHousehold(caller.householdId, [
          CACHE_RESOURCE.members,
          CACHE_RESOURCE.household,
          CACHE_RESOURCE.balances,
          CACHE_RESOURCE.notifications,
        ]);
      }),
  });
}

export async function setMemberRole(
  form: SetMemberRoleSchemaType,
): Promise<ActionResult> {
  return withHouseholdAction(
    "Unable to change this member's access. Try again.",
    async ({ caller }) => {
      const { role: nextRole } = await setMemberRoleSeam(caller, form);

      await notify(
        actorFor(caller),
        caller.householdId,
        form.userId,
        "member_role",
        nextRole === VIEW_ONLY_ROLE
          ? `${caller.actorName} set your access to view-only in this household.`
          : `${caller.actorName} gave you full edit access in this household.`,
      );
      revalidateHousehold(caller.householdId, [
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
    async ({ caller }) => {
      const updated = await setEmailDigestSeam(
        caller.householdId,
        caller.userId,
        form,
      );
      revalidateHousehold(caller.householdId, [CACHE_RESOURCE.members]);
      return updated;
    },
  );
}
