import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Set up your household",
  robots: { index: false, follow: false },
};

const layout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="relative flex min-h-dvh w-full flex-col items-center justify-center px-4 py-12">
      <main className="w-full">{children}</main>
    </div>
  );
};

export default layout;
