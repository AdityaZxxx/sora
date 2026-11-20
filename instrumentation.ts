import type { Instrumentation } from "next";

const edgeLog = (
  level: "info" | "error",
  event: string,
  fields?: Record<string, string | number>,
) => {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      event,
      ...fields,
    }),
  );
};

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    edgeLog("info", "instrumentation.ready");
    return;
  }

  const { logInfo } = await import("@/lib/log");
  logInfo("instrumentation.ready");
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  const fields = {
    outcome: "failed" as const,
    error: error instanceof Error ? error.message : String(error),
    path: request.path,
    route: context.routePath,
  };

  if (process.env.NEXT_RUNTIME !== "nodejs") {
    edgeLog("error", "request.error", fields);
    return;
  }

  const { logError } = await import("@/lib/log");
  logError("request.error", fields);
};
