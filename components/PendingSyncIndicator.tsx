"use client";

import { AlertTriangle, CloudUpload, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { usePendingSync } from "@/hooks/use-pending-sync";
import {
  installWriteInterceptor,
  replayWrites,
  uninstallWriteInterceptor,
} from "@/lib/offline-write-queue";

function label(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export default function PendingSyncIndicator() {
  const router = useRouter();
  const { pending, failed, retry } = usePendingSync();
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    installWriteInterceptor();
    return () => uninstallWriteInterceptor();
  }, []);

  useEffect(() => {
    const replay = () => {
      if (!navigator.onLine) return;
      void replayWrites().then(({ synced }) => {
        if (synced > 0) router.refresh();
        return undefined;
      });
    };
    replay();
    window.addEventListener("online", replay);
    return () => window.removeEventListener("online", replay);
  }, [router]);

  const handleRetry = async () => {
    setSyncing(true);
    const { synced, failed: stillFailed } = await retry();
    setSyncing(false);
    if (synced > 0) router.refresh();
    if (stillFailed > 0) {
      toast.error(
        `${label(stillFailed, "change", "changes")} still could not sync.`,
      );
    } else {
      toast.success("Pending changes synced.");
    }
  };

  if (pending.length === 0 && failed.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-muted px-4 py-2 text-center text-sm font-medium">
      {pending.length > 0 && (
        <p role="status" className="flex items-center gap-2 text-amber-950">
          <CloudUpload className="h-4 w-4 shrink-0" aria-hidden="true" />
          {label(pending.length, "change", "changes")} pending sync
        </p>
      )}
      {failed.length > 0 && (
        <div role="alert" className="flex items-center gap-2 text-rose-950">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            {label(failed.length, "change", "changes")} failed to sync
            {failed[0]?.error ? `: ${failed[0].error}` : ""}
          </span>
          <button
            type="button"
            onClick={() => void handleRetry()}
            disabled={syncing}
            className="inline-flex items-center gap-1 rounded-md bg-rose-950 px-2 py-1 text-xs font-semibold text-rose-50 disabled:opacity-60"
          >
            <RefreshCw
              className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
