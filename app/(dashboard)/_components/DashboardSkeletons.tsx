import { Skeleton } from "@/components/ui/skeleton";

export function OverviewSkeleton() {
  return (
    <div className="section space-y-6" aria-hidden="true">
      <Skeleton className="h-24 w-full" />
      <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
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
