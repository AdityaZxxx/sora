"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

import { useWallets } from "@/hooks/use-wallets";
import { useSession } from "@/lib/auth-client";
import {
  WALLET_EVENTS_ENDPOINT,
  walletChangeEffects,
  walletChangeSchema,
} from "@/lib/wallet-change";

export function useWalletEvents() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: session } = useSession();
  const { data: walletsData } = useWallets();
  const viewerId = session?.user.id;
  const activeWalletId = walletsData?.active.id;

  useEffect(() => {
    if (!viewerId || !activeWalletId) {
      return;
    }

    const source = new EventSource(WALLET_EVENTS_ENDPOINT);

    source.addEventListener("message", (event) => {
      let data: unknown;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      const parsed = walletChangeSchema.safeParse(data);
      if (!parsed.success) {
        return;
      }

      const change = parsed.data;
      if (change.walletId !== activeWalletId) {
        return;
      }
      if (change.recipientId && change.recipientId !== viewerId) {
        return;
      }
      if (
        change.resource !== "notifications" &&
        change.actorId &&
        change.actorId !== viewerId
      ) {
        toast(change.message);
      }
      for (const queryKey of walletChangeEffects(change.resource, change.scope)
        .clientKeys) {
        void queryClient.invalidateQueries({ queryKey });
      }
      router.refresh();
    });

    return () => source.close();
  }, [queryClient, router, viewerId, activeWalletId]);
}
