import type { ReactNode } from "react";

import { Suspense } from "react";

import InstallPrompt from "@/components/InstallPrompt";
import NewExpenseShortcut from "@/components/NewExpenseShortcut";
import OfflineIndicator from "@/components/OfflineIndicator";
import PendingSyncIndicator from "@/components/PendingSyncIndicator";
import { Skeleton } from "@/components/ui/skeleton";

import SeededNavbar from "./_components/SeededNavbar";

const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="relative flex h-dvh w-full flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:ring-2 focus:ring-ring focus:ring-inset"
      >
        Skip to content
      </a>
      <OfflineIndicator />
      <PendingSyncIndicator />
      <NewExpenseShortcut />
      <Suspense
        fallback={
          <Skeleton className="h-16 w-full rounded-none" aria-hidden="true" />
        }
      >
        <SeededNavbar />
      </Suspense>
      <main id="main-content" className="w-full flex-1">
        {children}
      </main>
      <InstallPrompt />
    </div>
  );
};

export default Layout;
