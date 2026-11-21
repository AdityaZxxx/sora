"use server";

import type { CreateTransactionSchemaType } from "@/schemas/transaction";

import { headers } from "next/headers";

import { withHouseholdAction } from "@/lib/action-result";
import { createTransaction } from "@/lib/transactions";

export type CreateTransactionActionInput = CreateTransactionSchemaType & {
  idempotencyKey?: string;
};

export async function CreateTransaction(form: CreateTransactionActionInput) {
  return withHouseholdAction(
    "Unable to add the transaction. Check the amount, category and date, then try again.",
    async ({ household, session, membership }) => {
      const requestHeaders = await headers();
      const idempotencyKey =
        form.idempotencyKey ??
        requestHeaders.get("x-sora-idempotency-key") ??
        undefined;

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
          idempotencyKey,
        },
        membership.role,
      );
    },
  );
}
