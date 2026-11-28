import { DomainError } from "@/lib/errors";
import { logError, logInfo, logWarn } from "@/lib/log";
import { rememberErrorRequestId, withRequestId } from "@/lib/request-id";
import { requireWallet } from "@/lib/wallet";

export type WalletActionContext = NonNullable<
  Awaited<ReturnType<typeof requireWallet>>
>;

type TransportEvents = {
  unauthorized: string;
  completed: string;
  rejected: string;
  failed: string;
};

type TransportAdapter<TData, TResult> = {
  events: TransportEvents;
  unauthorized: () => TResult;
  success: (data: TData) => TResult;
  domainError: (cause: DomainError) => { message: string; result: TResult };
  successLogFields?: (data: TData) => Record<string, string | number>;
};

export async function withWalletTransport<TData, TResult>(
  adapter: TransportAdapter<TData, TResult>,
  operation: (context: WalletActionContext) => Promise<TData> | TData,
): Promise<TResult> {
  return withRequestId(async () => {
    const startedAt = Date.now();
    const result = await requireWallet();
    if (!result) {
      logWarn(adapter.events.unauthorized, {
        outcome: "rejected",
        durationMs: Date.now() - startedAt,
      });
      return adapter.unauthorized();
    }

    const walletId = result.wallet.id;
    const userId = result.session.user.id;

    try {
      const data = await operation(result);
      logInfo(adapter.events.completed, {
        walletId,
        userId,
        outcome: "ok",
        durationMs: Date.now() - startedAt,
        ...adapter.successLogFields?.(data),
      });
      return adapter.success(data);
    } catch (cause) {
      const durationMs = Date.now() - startedAt;
      if (cause instanceof DomainError) {
        const handled = adapter.domainError(cause);
        logWarn(adapter.events.rejected, {
          walletId,
          userId,
          outcome: "rejected",
          durationMs,
          error: handled.message,
        });
        return handled.result;
      }
      logError(adapter.events.failed, {
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
