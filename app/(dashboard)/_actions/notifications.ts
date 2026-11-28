"use server";

import { withWalletAction } from "@/lib/action-result";
import { actorFor } from "@/lib/caller";
import { markNotificationsRead } from "@/lib/notifications";

export async function markAllRead() {
  return withWalletAction(
    "Unable to mark the notifications as read. Refresh the page and try again.",
    async ({ caller }) => {
      await markNotificationsRead(caller.walletId, actorFor(caller));
    },
  );
}
