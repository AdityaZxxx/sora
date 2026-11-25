import { Skeleton } from "@/components/ui/skeleton";

import {
  DashboardSectionsSkeleton,
  OverviewSkeleton,
} from "./_components/DashboardSkeletons";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container pt-6">
        <div className="rounded-xl border bg-card px-6 py-8">
          <Skeleton className="h-8 w-56" />
        </div>
      </div>
      <OverviewSkeleton />
      <DashboardSectionsSkeleton />
    </div>
  );
}
