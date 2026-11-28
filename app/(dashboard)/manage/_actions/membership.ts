"use server";

import type {
  SetEmailDigestSchemaType,
  SetMemberRoleSchemaType,
} from "@/schemas/membership";
import type { WalletMembership } from "@prisma/client";

import { redirect } from "next/navigation";

import { type ActionResult, withWalletAction } from "@/lib/action-result";
import { actorFor } from "@/lib/caller";
import {
  formText,
  fromActionResult,
  submitFormAction,
  type FormActionState,
} from "@/lib/form-action";
import {
  leaveWallet as leaveWalletSeam,
  removeMember as removeMemberSeam,
  setEmailDigest as setEmailDigestSeam,
  setMemberRole as setMemberRoleSeam,
} from "@/lib/members";
import { notify, notifyWalletExcept } from "@/lib/notifications";
import { roleLabel } from "@/lib/roles";
import {
  clearActiveWalletCookie,
  firstWalletIdForUser,
  setActiveWalletCookie,
} from "@/lib/wallet";
import { RemoveMemberSchema } from "@/schemas/membership";

const LEAVE_ERROR =
  "Unable to leave this wallet. Refresh the page and try again.";
const REMOVE_ERROR = "Unable to remove this member. Try again.";

export async function leaveWalletAction(): Promise<ActionResult> {
  return withWalletAction(LEAVE_ERROR, async ({ caller }) => {
    await leaveWalletSeam(caller);
  });
}

export async function leaveWalletForm(
  _previous: FormActionState,
  _formData: FormData,
): Promise<FormActionState> {
  const result = await withWalletAction(LEAVE_ERROR, async ({ caller }) => {
    await leaveWalletSeam(caller);

    const nextWalletId = await firstWalletIdForUser(caller.userId);
    if (nextWalletId) {
      await setActiveWalletCookie(nextWalletId);
    } else {
      await clearActiveWalletCookie();
    }

    redirect("/");
  });
  return fromActionResult(result, "You left the wallet");
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
    success: "Member removed from the wallet",
    run: (input) =>
      withWalletAction(REMOVE_ERROR, async ({ caller }) => {
        const removedName = await removeMemberSeam(caller, input);

        await notifyWalletExcept(
          actorFor(caller),
          caller.walletId,
          caller.userId,
          "member_left",
          `${removedName} was removed from the wallet.`,
        );
      }),
  });
}

export async function setMemberRole(
  form: SetMemberRoleSchemaType,
): Promise<ActionResult> {
  return withWalletAction(
    "Unable to change this member's access. Try again.",
    async ({ caller }) => {
      const { role: nextRole } = await setMemberRoleSeam(caller, form);

      await notify(
        actorFor(caller),
        caller.walletId,
        form.userId,
        "member_role",
        `${caller.actorName} set your role to ${roleLabel(nextRole).toLowerCase()} in this wallet.`,
      );
    },
  );
}

export async function setEmailDigest(
  form: SetEmailDigestSchemaType,
): Promise<ActionResult<WalletMembership>> {
  return withWalletAction(
    "Unable to update the email digest. Try again.",
    async ({ caller }) => {
      const updated = await setEmailDigestSeam(
        caller.walletId,
        actorFor(caller),
        form,
      );
      return updated;
    },
  );
}
