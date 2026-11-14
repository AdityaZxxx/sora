import { z } from "zod";

import { amountNumber } from "@/schemas/money";

export const BudgetModeSchema = z.enum(["soft", "hard"]);

export function budgetFields(coerced: boolean) {
  return {
    category: z.string().min(1, "Select a category"),
    amount: amountNumber(coerced),
    mode: BudgetModeSchema,
  };
}

const fields = budgetFields(true);

export const CreateBudgetSchema = z.object(fields);

export type CreateBudgetSchemaType = z.output<typeof CreateBudgetSchema>;

export const UpdateBudgetSchema = z.object({
  id: z.string().min(1),
  ...fields,
});

export type UpdateBudgetSchemaType = {
  id: string;
  category: string;
  amount: number;
  mode: "soft" | "hard";
};
