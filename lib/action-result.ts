import { redirect } from "next/navigation";

import { firstIssueMessage } from "@/lib/issue-message";
import {
  withWalletTransport,
  type WalletActionContext,
} from "@/lib/wallet-transport";

export type { WalletActionContext } from "@/lib/wallet-transport";

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

export async function withWalletAction<T>(
  fallback: string,
  operation: (context: WalletActionContext) => Promise<T> | T,
): Promise<ActionResult<T>> {
  return withWalletTransport<T, ActionResult<T>>(
    {
      events: {
        unauthorized: "action.unauthorized",
        completed: "action.completed",
        rejected: "action.rejected",
        failed: "action.failed",
      },
      unauthorized: () => {
        redirect("/sign-in");
      },
      success: (data) => ok(data),
      domainError: (cause) => {
        const message = firstIssueMessage(cause.message, fallback);
        return { message, result: fail(message) };
      },
    },
    operation,
  );
}
