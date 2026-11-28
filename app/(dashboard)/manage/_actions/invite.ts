"use server";

import type { RevokeInviteLinkSchemaType } from "@/schemas/invite";
import type { InviteLink } from "@prisma/client";

import { type ActionResult, withWalletAction } from "@/lib/action-result";
import { actorFor } from "@/lib/caller";
import {
  createInviteLink as createInviteLinkSeam,
  revokeInviteLink as revokeInviteLinkSeam,
  rotateInviteLink as rotateInviteLinkSeam,
} from "@/lib/invites";

export async function createInviteLink(): Promise<ActionResult<InviteLink>> {
  return withWalletAction(
    "Unable to create the invite link. Try again.",
    async ({ wallet, caller }) => {
      const created = await createInviteLinkSeam(
        wallet.id,
        actorFor(caller),
        caller.role,
      );
      return created;
    },
  );
}

export async function rotateInviteLink(): Promise<ActionResult<InviteLink>> {
  return withWalletAction(
    "Unable to rotate the invite link. Try again.",
    async ({ wallet, caller }) => {
      const created = await rotateInviteLinkSeam(
        wallet.id,
        actorFor(caller),
        caller.role,
      );
      return created;
    },
  );
}

export async function revokeInviteLink(
  form: RevokeInviteLinkSchemaType,
): Promise<ActionResult> {
  return withWalletAction(
    "Unable to revoke the invite link. Try again.",
    async ({ wallet, caller }) => {
      await revokeInviteLinkSeam(
        wallet.id,
        form.id,
        caller.role,
        actorFor(caller),
      );
    },
  );
}
