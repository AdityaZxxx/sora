"use client";

import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { MotionConfig } from "motion/react";
import { ThemeProvider } from "next-themes";
import { useReportWebVitals } from "next/web-vitals";
import { useState } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { useWalletEvents } from "@/hooks/use-wallet-events";
import { logClientInfo } from "@/instrumentation-client";
import { QUERY_GC_TIME, QUERY_STALE_TIME } from "@/lib/constants";

const WalletEvents = () => {
  useWalletEvents();
  return null;
};

const reportWebVital: Parameters<typeof useReportWebVitals>[0] = (metric) => {
  logClientInfo(`web-vitals.${metric.name}`, {
    value: metric.value,
    rating: metric.rating,
    path: metric.navigationURL,
  });
};

const RootProvider = ({ children }: { children: ReactNode }) => {
  useReportWebVitals(reportWebVital);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: QUERY_STALE_TIME,
            gcTime: QUERY_GC_TIME,
            retry: 1,
            refetchOnWindowFocus: true,
            refetchIntervalInBackground: false,
          },
        },
      }),
  );

  return (
    <MotionConfig reducedMotion="user">
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>{children}</TooltipProvider>
          <WalletEvents />
        </ThemeProvider>
        {process.env.NODE_ENV === "development" && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </QueryClientProvider>
    </MotionConfig>
  );
};

export default RootProvider;
