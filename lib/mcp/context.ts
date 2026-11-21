import type { TokenAuth } from "@/lib/api-token";
import type { Caller } from "@/lib/caller";

export type McpContext = Caller & {
  householdName: string | null;
  currency: string | null;
};

export function contextFromToken(
  auth: Extract<TokenAuth, { ok: true }>,
): McpContext {
  return {
    ...auth.caller,
    householdName: auth.household.name,
    currency: auth.household.currency,
  };
}
