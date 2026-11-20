"use client";

import { WifiOff } from "lucide-react";

import { useOfflineSnapshot } from "@/hooks/use-offline-snapshot";
import { useServiceWorker } from "@/hooks/use-service-worker";

export default function OfflineIndicator() {
  useServiceWorker();
  const { isOnline } = useOfflineSnapshot();

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-amber-400 px-4 py-2 text-center text-sm font-medium text-amber-950"
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      Offline. Showing your last saved balances. Reconnect to see individual
      transactions.
    </div>
  );
}
