"use server";

import type { Wallet } from "@prisma/client";

import { revalidatePath } from "next/cache";

import { type ActionResult, withWalletAction } from "@/lib/action-result";
import { updateWalletCurrency } from "@/lib/wallet";

export async function UpdateUserCurrency(
  currency: string,
): Promise<ActionResult<Wallet>> {
  return withWalletAction(
    "That currency is not supported. Choose one from the list.",
    async ({ caller }) => {
      const updated = await updateWalletCurrency(caller, currency);

      revalidatePath("/", "layout");

      return updated;
    },
  );
}
