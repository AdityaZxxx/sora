"use server";

import type { RecordSettlementSchemaType } from "@/schemas/settlement";

import { withHouseholdAction } from "@/lib/action-result";
import { getMemberBalances } from "@/lib/balances";
import { CACHE_RESOURCE, revalidateHousehold } from "@/lib/cache";
import { recordSettlement } from "@/lib/settlements";

export async function RecordSettlement(form: RecordSettlementSchemaType) {
  return withHouseholdAction(
    "Unable to record the settlement. Select the member and enter a valid amount, then try again.",
    async ({ caller }) => {
      await recordSettlement(caller, {
        memberId: form.memberId,
        amount: form.amount,
      });
      revalidateHousehold(caller.householdId, [
        CACHE_RESOURCE.balances,
        CACHE_RESOURCE.transactions,
      ]);
      const balances = await getMemberBalances(
        caller.householdId,
        caller.userId,
      );
      return balances;
    },
  );
}
