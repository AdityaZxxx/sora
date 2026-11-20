"use server";

import type { RevokeInviteLinkSchemaType } from "@/schemas/invite";
import type { InviteLink } from "@prisma/client";

import { type ActionResult, withHouseholdAction } from "@/lib/action-result";
import { CACHE_RESOURCE, revalidateHousehold } from "@/lib/cache";
import {
  createInviteLink as createInviteLinkSeam,
  revokeInviteLink as revokeInviteLinkSeam,
} from "@/lib/invites";

export async function createInviteLink(): Promise<ActionResult<InviteLink>> {
  return withHouseholdAction(
    "Unable to create the invite link. Try again.",
    async ({ household, session, membership }) => {
      const created = await createInviteLinkSeam(
        household.id,
        session.user.id,
        membership.role,
      );
      revalidateHousehold(household.id, [CACHE_RESOURCE.invites]);
      return created;
    },
  );
}

export async function revokeInviteLink(
  form: RevokeInviteLinkSchemaType,
): Promise<ActionResult> {
  return withHouseholdAction(
    "Unable to revoke the invite link. Try again.",
    async ({ household, membership }) => {
      await revokeInviteLinkSeam(household.id, form.id, membership.role);
      revalidateHousehold(household.id, [CACHE_RESOURCE.invites]);
    },
  );
}
