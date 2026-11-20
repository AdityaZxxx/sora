import { redirect } from "next/navigation";

import { DomainError } from "@/lib/errors";
import { requireHousehold } from "@/lib/household";
import { firstIssueMessage } from "@/lib/issue-message";
import { logError, logInfo, logWarn } from "@/lib/log";
import { withRequestId } from "@/lib/request-id";

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; message: string };

export function ok(): ActionResult;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T): ActionResult<T> {
  return data === undefined ? { ok: true } : { ok: true, data };
}

export function fail(message: string): ActionResult<never> {
  return { ok: false, message };
}

export type HouseholdActionContext = NonNullable<
  Awaited<ReturnType<typeof requireHousehold>>
>;

export async function withHouseholdAction<T>(
  fallback: string,
  operation: (context: HouseholdActionContext) => Promise<T> | T,
): Promise<ActionResult<T>> {
  return withRequestId(async () => {
    const startedAt = Date.now();
    const result = await requireHousehold();
    if (!result) {
      logWarn("action.unauthorized", {
        outcome: "rejected",
        durationMs: Date.now() - startedAt,
      });
      redirect("/sign-in");
    }

    const householdId = result.household.id;
    const userId = result.session.user.id;

    try {
      const data = await operation(result);
      logInfo("action.completed", {
        householdId,
        userId,
        outcome: "ok",
        durationMs: Date.now() - startedAt,
      });
      return ok(data);
    } catch (cause) {
      const durationMs = Date.now() - startedAt;
      if (cause instanceof DomainError) {
        const message = firstIssueMessage(cause.message, fallback);
        logWarn("action.rejected", {
          householdId,
          userId,
          outcome: "rejected",
          durationMs,
          error: message,
        });
        return fail(message);
      }
      logError("action.failed", {
        householdId,
        userId,
        outcome: "failed",
        durationMs,
        error: cause instanceof Error ? cause.message : String(cause),
      });
      throw cause;
    }
  });
}
