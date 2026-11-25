"use server";

import type { RevokeInviteLinkSchemaType } from "@/schemas/invite";
import type { InviteLink } from "@prisma/client";

import { type ActionResult, withWalletAction } from "@/lib/action-result";
import { CACHE_RESOURCE, revalidateWallet } from "@/lib/cache";
import {
  createInviteLink as createInviteLinkSeam,
  revokeInviteLink as revokeInviteLinkSeam,
} from "@/lib/invites";

export async function createInviteLink(): Promise<ActionResult<InviteLink>> {
  return withWalletAction(
    "Unable to create the invite link. Try again.",
    async ({ wallet, session, membership }) => {
      const created = await createInviteLinkSeam(
        wallet.id,
        session.user.id,
        membership.role,
      );
      revalidateWallet(wallet.id, [CACHE_RESOURCE.invites]);
      return created;
    },
  );
}

export async function revokeInviteLink(
  form: RevokeInviteLinkSchemaType,
): Promise<ActionResult> {
  return withWalletAction(
    "Unable to revoke the invite link. Try again.",
    async ({ wallet, membership }) => {
      await revokeInviteLinkSeam(wallet.id, form.id, membership.role);
      revalidateWallet(wallet.id, [CACHE_RESOURCE.invites]);
    },
  );
}
