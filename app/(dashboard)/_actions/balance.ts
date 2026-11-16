"use server";

import type { RecordSettlementSchemaType } from "@/schemas/settlement";

import { withHouseholdAction } from "@/lib/action-result";
import { recordSettlement } from "@/lib/settlements";

export async function RecordSettlement(form: RecordSettlementSchemaType) {
  return withHouseholdAction(
    "Unable to record the settlement. Select the member and enter a valid amount, then try again.",
    async ({ household, session, membership }) => {
      await recordSettlement(
        household.id,
        session.user.id,
        { memberId: form.memberId, amount: form.amount },
        membership.role,
      );
    },
  );
}
