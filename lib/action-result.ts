import { redirect } from "next/navigation";

import { DomainError } from "@/lib/errors";
import { firstIssueMessage } from "@/lib/issue-message";
import { logError, logInfo, logWarn } from "@/lib/log";
import { rememberErrorRequestId, withRequestId } from "@/lib/request-id";
import { requireWallet } from "@/lib/wallet";

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

export type WalletActionContext = NonNullable<
  Awaited<ReturnType<typeof requireWallet>>
>;

export async function withWalletAction<T>(
  fallback: string,
  operation: (context: WalletActionContext) => Promise<T> | T,
): Promise<ActionResult<T>> {
  return withRequestId(async () => {
    const startedAt = Date.now();
    const result = await requireWallet();
    if (!result) {
      logWarn("action.unauthorized", {
        outcome: "rejected",
        durationMs: Date.now() - startedAt,
      });
      redirect("/sign-in");
    }

    const walletId = result.wallet.id;
    const userId = result.session.user.id;

    try {
      const data = await operation(result);
      logInfo("action.completed", {
        walletId,
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
          walletId,
          userId,
          outcome: "rejected",
          durationMs,
          error: message,
        });
        return fail(message);
      }
      logError("action.failed", {
        walletId,
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
