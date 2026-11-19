"use client";

import "./globals.css";

export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="en">
      <head>
        <title>Something went wrong | Sora</title>
      </head>
      <body className="mx-auto flex min-h-dvh max-w-7xl items-center justify-center bg-background px-4 text-foreground antialiased">
        <div className="w-[min(400px,calc(100vw-2rem))] rounded-xl border bg-card px-6 py-8 text-center shadow-xs">
          <h1 className="text-xl font-bold">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sora could not load this page. Try again in a moment.
          </p>
          <button
            type="button"
            onClick={retry}
            className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
