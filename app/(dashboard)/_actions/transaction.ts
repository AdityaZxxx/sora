"use server";

import { withHouseholdAction } from "@/lib/action-result";
import {
  createTransaction,
  type CreateTransactionInput,
} from "@/lib/transactions";

export type CreateTransactionActionInput = Omit<
  CreateTransactionInput,
  "addedVia"
>;

export async function CreateTransaction(form: CreateTransactionActionInput) {
  return withHouseholdAction(
    "Unable to add the transaction. Check the amount, category and date, then try again.",
    async ({ household, session, membership }) => {
      await createTransaction(
        household.id,
        session.user.id,
        {
          amount: form.amount,
          category: form.category,
          description: form.description,
          date: form.date,
          type: form.type,
          shared: form.shared,
          goalId: form.goalId || undefined,
          shares: form.shares,
          recurringItemId: form.recurringItemId,
          idempotencyKey: form.idempotencyKey,
        },
        membership.role,
      );
    },
  );
}
