import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <header className="container pt-6">
        <div className="rounded-xl border bg-card px-6 py-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-8 w-44" />
              <Skeleton className="h-4 w-72" />
            </div>
            <Skeleton className="h-9 w-64" />
          </div>
        </div>
      </header>
      <div className="container space-y-3 py-8">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
