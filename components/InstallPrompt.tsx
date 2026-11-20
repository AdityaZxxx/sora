"use client";

import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

const DISMISSED_KEY = "sora:install-dismissed";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function readDismissed() {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export default function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [dismissed, setDismissed] = useState(readDismissed);
  const [isIos] = useState(
    () =>
      typeof navigator !== "undefined" &&
      /iPad|iPhone|iPod/u.test(navigator.userAgent) &&
      !("MSStream" in window),
  );

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, []);

  const dismiss = () => {
    setDismissed(true);
    setInstallEvent(null);
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      return;
    }
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    dismiss();
  };

  if (dismissed) {
    return null;
  }

  if (installEvent) {
    return (
      <aside
        aria-label="Install Sora"
        className="fixed bottom-4 left-4 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-xl border bg-card p-4 shadow-lg"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Install Sora</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add Sora to your home screen for quick access and offline
              balances.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            aria-label="Dismiss install prompt"
            onClick={dismiss}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <Button type="button" className="mt-3 w-full" onClick={install}>
          <Download className="h-4 w-4" aria-hidden="true" />
          Install
        </Button>
      </aside>
    );
  }

  if (isIos) {
    return (
      <aside
        aria-label="Install Sora"
        className="fixed bottom-4 left-4 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-xl border bg-card p-4 shadow-lg"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Install Sora</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Tap the share button, then Add to Home Screen, to install Sora on
              your iPhone.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            aria-label="Dismiss install prompt"
            onClick={dismiss}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </aside>
    );
  }

  return null;
}
