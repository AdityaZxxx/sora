import { z } from "zod";

import { amountNumber, sharesArray } from "@/schemas/money";
import { freeText } from "@/schemas/text";

export function transactionFields(coerced: boolean) {
  return {
    amount: amountNumber(coerced),
    description: freeText({ max: 200 }).optional(),
    category: z.string().min(1, "Select a category"),
    type: z.enum(["income", "expense"]),
    goalId: z.string().optional(),
    shares: sharesArray(coerced).optional(),
    recurringItemId: z.string().min(1).optional(),
  };
}

export const TransactionDraftSchema = z.object({
  ...transactionFields(true),
  id: z.string().min(1).optional(),
  date: z.date(),
});

export type TransactionDraftSchemaType = z.infer<typeof TransactionDraftSchema>;
