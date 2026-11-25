import type { Instrumentation } from "next";

import { errorFields } from "@/lib/error-fields";

const edgeLog = (
  level: "info" | "error",
  event: string,
  fields?: Record<string, string | number | undefined>,
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

function requestErrorFields(
  cause: unknown,
  request: Parameters<Instrumentation.onRequestError>[1],
  context: Parameters<Instrumentation.onRequestError>[2],
) {
  const details = errorFields(cause);
  return {
    outcome: "failed" as const,
    error: details.error,
    stack: details.stack,
    digest: details.digest,
    path: request.path,
    route: context.routePath,
  };
}

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
  const fields = requestErrorFields(error, request, context);

  if (process.env.NEXT_RUNTIME !== "nodejs") {
    edgeLog("error", "request.error", {
      ...fields,
      requestId: crypto.randomUUID(),
    });
    return;
  }

  const { logError } = await import("@/lib/log");
  const { errorRequestId, getRequestId } = await import("@/lib/request-id");

  logError("request.error", {
    ...fields,
    requestId: getRequestId() ?? errorRequestId(error),
  });
};
