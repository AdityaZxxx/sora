"use server";

import type { RevokeInviteLinkSchemaType } from "@/schemas/invite";
import type { InviteLink } from "@prisma/client";

import { type ActionResult, withHouseholdAction } from "@/lib/action-result";
import {
  createInviteLink as createInviteLinkSeam,
  revokeInviteLink as revokeInviteLinkSeam,
} from "@/lib/invites";
import prisma from "@/lib/prisma";

export async function createInviteLink(): Promise<ActionResult<InviteLink>> {
  return withHouseholdAction(
    "Unable to create the invite link. Try again.",
    ({ household, session, membership }) =>
      createInviteLinkSeam(household.id, session.user.id, membership.role),
  );
}

export async function revokeInviteLink(
  form: RevokeInviteLinkSchemaType,
): Promise<ActionResult> {
  return withHouseholdAction(
    "Unable to revoke the invite link. Try again.",
    async ({ household, membership }) => {
      await revokeInviteLinkSeam(household.id, form.id, membership.role);
    },
  );
}

export async function listInviteLinks(): Promise<ActionResult<InviteLink[]>> {
  return withHouseholdAction(
    "Unable to load the invite links. Refresh the page and try again.",
    ({ household }) =>
      prisma.inviteLink.findMany({
        where: {
          householdId: household.id,
          revokedAt: null,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
  );
}
