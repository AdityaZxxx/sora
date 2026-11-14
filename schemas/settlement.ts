import { z } from "zod";

import { amountNumber } from "@/schemas/money";

export function settlementFields(coerced: boolean) {
  return {
    memberId: z.string().min(1, "Select a member"),
    amount: amountNumber(coerced),
  };
}

export const RecordSettlementSchema = z.object(settlementFields(true));

export type RecordSettlementSchemaType = z.infer<typeof RecordSettlementSchema>;
