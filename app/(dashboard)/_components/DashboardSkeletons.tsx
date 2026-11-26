import { Skeleton } from "@/components/ui/skeleton";

export function OverviewSkeleton() {
  return (
    <div className="section grid gap-6 md:grid-cols-3" aria-hidden="true">
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

export function DashboardSectionsSkeleton() {
  return (
    <div className="section space-y-6" aria-hidden="true">
      <Skeleton className="h-64 w-full" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-52 w-full" />
        <Skeleton className="h-52 w-full lg:col-span-2" />
      </div>
      <Skeleton className="h-40 w-full" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
      <Skeleton className="h-80 w-full" />
    </div>
  );
}
