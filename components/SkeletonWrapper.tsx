import type { ReactNode } from "react";

import { cn } from "../lib/utils";
import { Skeleton } from "./ui/skeleton";

const SkeletonWrapper = ({
  children,
  isLoading,
  fullWidth = true,
}: {
  children: ReactNode;
  isLoading: boolean;
  fullWidth?: boolean;
}) => {
  if (!isLoading) return children;
  return (
    <Skeleton className={cn(fullWidth && "w-full")}>
      <span role="status" className="sr-only">
        Loading
      </span>
      <div aria-hidden="true" aria-busy="true" inert className="opacity-0">
        {children}
      </div>
    </Skeleton>
  );
};

export default SkeletonWrapper;
