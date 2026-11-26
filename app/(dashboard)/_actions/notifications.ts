"use server";

import { withWalletAction } from "@/lib/action-result";
import { CACHE_RESOURCE, revalidateWallet } from "@/lib/cache";
import { markNotificationsRead } from "@/lib/notifications";

export async function markAllRead() {
  return withWalletAction(
    "Unable to mark the notifications as read. Refresh the page and try again.",
    async ({ wallet, session }) => {
      await markNotificationsRead(wallet.id, session.user.id);
      revalidateWallet(wallet.id, [CACHE_RESOURCE.notifications]);
    },
  );
}
