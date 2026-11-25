import type { TokenAuth } from "@/lib/api-token";
import type { Caller } from "@/lib/caller";

export type McpContext = Caller & {
  walletName: string | null;
  currency: string | null;
};

export function contextFromToken(
  auth: Extract<TokenAuth, { ok: true }>,
): McpContext {
  return {
    ...auth.caller,
    walletName: auth.wallet.name,
    currency: auth.wallet.currency,
  };
}
