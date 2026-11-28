"use server";

import type { RecordSettlementSchemaType } from "@/schemas/settlement";

import { withWalletAction } from "@/lib/action-result";
import { getMemberBalances } from "@/lib/balances";
import { recordSettlement } from "@/lib/settlements";

export async function RecordSettlement(form: RecordSettlementSchemaType) {
  return withWalletAction(
    "Unable to record the settlement. Select the member and enter a valid amount, then try again.",
    async ({ caller }) => {
      await recordSettlement(caller, {
        memberId: form.memberId,
        amount: form.amount,
        direction: form.direction,
      });
      const balances = await getMemberBalances(caller.walletId, caller.userId);
      return balances;
    },
  );
}
