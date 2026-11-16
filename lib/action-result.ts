import { redirect } from "next/navigation";

import { DomainError } from "@/lib/errors";
import { requireHousehold } from "@/lib/household";
import { firstIssueMessage } from "@/lib/issue-message";

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
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  try {
    return ok(await operation(result));
  } catch (cause) {
    if (cause instanceof DomainError) {
      return fail(firstIssueMessage(cause.message, fallback));
    }
    throw cause;
  }
}
