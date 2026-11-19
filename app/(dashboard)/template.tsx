import type { ReactNode } from "react";

export default function Template({ children }: { children: ReactNode }) {
  return (
    <div className="animate-in duration-200 fade-in slide-in-from-bottom-2 motion-reduce:animate-none">
      {children}
    </div>
  );
}
