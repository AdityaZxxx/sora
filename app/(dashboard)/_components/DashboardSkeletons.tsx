import { Skeleton } from "@/components/ui/skeleton";

export function OverviewSkeleton() {
  return <Skeleton className="section h-48 w-full" aria-hidden="true" />;
}

export function DashboardSectionsSkeleton() {
  return (
    <div className="section space-y-4" aria-hidden="true">
      <Skeleton className="h-64 w-full" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-52 w-full" />
        <Skeleton className="h-52 w-full lg:col-span-2" />
      </div>
      <Skeleton className="h-40 w-full" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
      <Skeleton className="h-80 w-full" />
    </div>
  );
}
