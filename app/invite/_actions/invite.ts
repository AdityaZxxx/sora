"use server";

import { redirect } from "next/navigation";

import { type ActionResult, fail } from "@/lib/action-result";
import { getSession } from "@/lib/auth";
import { CACHE_RESOURCE, revalidateWallet } from "@/lib/cache";
import { DomainError } from "@/lib/errors";
import { joinWalletByInviteToken } from "@/lib/invites";
import { setActiveWalletCookie } from "@/lib/wallet";

// The join lives in a Server Action rather than the page render: Next.js
// forbids writing cookies while a page renders.
export async function joinWalletByToken(token: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) {
    redirect(`/sign-in?next=${encodeURIComponent(`/invite/${token}`)}`);
  }

  try {
    const walletId = await joinWalletByInviteToken(
      token,
      session.user.id,
      session.user.name,
    );
    await setActiveWalletCookie(walletId);
    revalidateWallet(walletId, [
      CACHE_RESOURCE.wallet,
      CACHE_RESOURCE.notifications,
      CACHE_RESOURCE.invites,
    ]);
  } catch (cause) {
    if (cause instanceof DomainError) {
      return fail(cause.message);
    }
    throw cause;
  }

  redirect("/");
}
