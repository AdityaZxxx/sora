"use client";

import "./globals.css";

import Link from "next/link";
import { useEffect } from "react";

import { logClientError } from "@/instrumentation-client";
import { errorFields } from "@/lib/error-fields";

export default function GlobalError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    logClientError("client.global-error", errorFields(error));

    let storedTheme: string | null;
    try {
      storedTheme = window.localStorage.getItem("theme");
    } catch {
      storedTheme = null;
    }
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    document.documentElement.classList.toggle(
      "dark",
      storedTheme === "dark" || (storedTheme !== "light" && prefersDark),
    );
  }, [error]);

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: light)"
          content="#ffffff"
        />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: dark)"
          content="#0E0F10"
        />
        <title>Something went wrong | Sora</title>
      </head>
      <body className="mx-auto flex min-h-dvh max-w-7xl items-center justify-center bg-background px-4 text-foreground antialiased">
        <div className="w-[min(400px,calc(100vw-2rem))] rounded-xl border bg-card px-6 py-8 text-center shadow-xs">
          <h1 className="text-xl font-bold">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sora could not load this page. Try again in a moment.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={retry}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              Try again
            </button>
            <Link
              href="/"
              className="inline-flex min-h-10 items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              Go to Sora
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
