import type { ReactNode } from "react";

import InstallPrompt from "@/components/InstallPrompt";
import Navbar from "@/components/Navbar";
import NewExpenseShortcut from "@/components/NewExpenseShortcut";
import OfflineIndicator from "@/components/OfflineIndicator";
import PendingSyncIndicator from "@/components/PendingSyncIndicator";

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
      <Navbar />
      <main id="main-content" className="w-full flex-1">
        {children}
      </main>
      <InstallPrompt />
    </div>
  );
};

export default Layout;
