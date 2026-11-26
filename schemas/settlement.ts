import { z } from "zod";

import { amountNumber } from "@/schemas/money";
import { freeText } from "@/schemas/text";

export function settlementFields(coerced: boolean) {
  return {
    memberId: z.string().min(1, "Select a member"),
    amount: amountNumber(coerced),
    date: z.coerce.date().optional(),
    note: freeText({ max: 200 }).optional(),
  };
}

export const RecordSettlementSchema = z.object(settlementFields(true));

export type RecordSettlementSchemaType = z.infer<typeof RecordSettlementSchema>;
