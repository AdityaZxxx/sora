import type { HouseholdActionContext } from "@/lib/action-result";
import type { z } from "zod";

import { resolveDateRange } from "@/lib/dates";
import { DomainError } from "@/lib/errors";
import { requireHousehold } from "@/lib/household";
import { rejection, unauthorized } from "@/lib/http-error";
import { logError, logInfo, logWarn } from "@/lib/log";
import { rememberErrorRequestId, withRequestId } from "@/lib/request-id";

export { rejection, unauthorized } from "@/lib/http-error";

type QueryInput = { [key: string]: string | null | undefined };

export function parseQueryParams<TSchema extends z.ZodType>(
  schema: TSchema,
  input: QueryInput,
): z.output<TSchema> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError(parsed.error.issues[0]?.message ?? "Invalid request");
  }
  return parsed.data;
}

export async function withHouseholdRoute(
  handler: (context: HouseholdActionContext) => Promise<Response> | Response,
): Promise<Response> {
  return withRequestId(async () => {
    const startedAt = Date.now();
    const result = await requireHousehold();
    if (!result) {
      logWarn("route.unauthorized", {
        outcome: "rejected",
        durationMs: Date.now() - startedAt,
      });
      return unauthorized();
    }

    const householdId = result.household.id;
    const userId = result.session.user.id;

    try {
      const response = await handler(result);
      logInfo("route.completed", {
        householdId,
        userId,
        outcome: "ok",
        durationMs: Date.now() - startedAt,
        status: response.status,
      });
      return response;
    } catch (cause) {
      const durationMs = Date.now() - startedAt;
      if (cause instanceof DomainError) {
        logWarn("route.rejected", {
          householdId,
          userId,
          outcome: "rejected",
          durationMs,
          error: cause.message,
        });
        return rejection(cause.message, 400);
      }
      logError("route.failed", {
        householdId,
        userId,
        outcome: "failed",
        durationMs,
        error: cause instanceof Error ? cause.message : String(cause),
      });
      rememberErrorRequestId(cause);
      throw cause;
    }
  });
}

export function dateRangeFromParams(searchParams: URLSearchParams) {
  return resolveDateRange(
    searchParams.get("from") ?? undefined,
    searchParams.get("to") ?? undefined,
  );
}

export function jsonReadResponse<T>(_request: Request, data: T): Response {
  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, no-cache",
    },
  });
}
