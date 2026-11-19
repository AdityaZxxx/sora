import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";

const SectionCard = ({ children }: { children: ReactNode }) => (
  <div className="space-y-4 rounded-xl border bg-card p-6">{children}</div>
);

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <header className="container pt-6">
        <div className="space-y-2 rounded-xl border bg-card px-6 py-8">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-80" />
        </div>
      </header>
      <div className="container py-8">
        <div className="space-y-8">
          <SectionCard>
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-72" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </SectionCard>

          <SectionCard>
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-80" />
            <Skeleton className="h-9 w-24" />
          </SectionCard>

          <SectionCard>
            <Skeleton className="h-5 w-32" />
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-full" />
                <Skeleton className="h-4 w-48" />
              </div>
            ))}
          </SectionCard>

          <SectionCard>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-10 w-full max-w-xs" />
          </SectionCard>

          <section className="space-y-6">
            <Skeleton className="h-6 w-56" />
            <div className="grid gap-6 md:grid-cols-2">
              {Array.from({ length: 2 }, (_, index) => (
                <div
                  key={index}
                  className="space-y-4 rounded-xl border bg-card p-6"
                >
                  <div className="flex items-center gap-4">
                    <Skeleton className="size-12 rounded-lg" />
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ))}
            </div>
          </section>

          <SectionCard>
            <Skeleton className="h-5 w-28" />
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </SectionCard>

          <SectionCard>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-40" />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
