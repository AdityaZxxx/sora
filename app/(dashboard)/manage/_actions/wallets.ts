"use server";

import type { Wallet } from "@prisma/client";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { type ActionResult, withWalletAction } from "@/lib/action-result";
import { getSession } from "@/lib/auth";
import { CACHE_RESOURCE, revalidateWallet } from "@/lib/cache";
import {
  assertWalletMembership,
  createAdditionalWallet,
  renameWallet as renameWalletSeam,
  setActiveWalletCookie,
} from "@/lib/wallet";

export async function switchWallet(walletId: string) {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }

  await assertWalletMembership(walletId, session.user.id);
  await setActiveWalletCookie(walletId);
  revalidateWallet(walletId, [CACHE_RESOURCE.wallet]);
  revalidatePath("/", "layout");
}

export async function renameWallet(
  name: string,
): Promise<ActionResult<Wallet>> {
  return withWalletAction(
    "Unable to rename this space. Check the name and try again.",
    async ({ caller }) => {
      const renamed = await renameWalletSeam(caller, name);
      revalidateWallet(caller.walletId, [CACHE_RESOURCE.wallet]);
      revalidatePath("/", "layout");
      return renamed;
    },
  );
}

export async function createWallet(name: string) {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }

  const wallet = await createAdditionalWallet(session.user.id, name);

  await setActiveWalletCookie(wallet.id);
  revalidateWallet(wallet.id, [CACHE_RESOURCE.wallet]);
  revalidatePath("/", "layout");
  return wallet;
}
