"use server";

import type { CreateTransactionSchemaType } from "@/schemas/transaction";

import { withHouseholdAction } from "@/lib/action-result";
import { CACHE_RESOURCE, revalidateHousehold } from "@/lib/cache";
import { createTransaction } from "@/lib/transactions";

export async function CreateTransaction(form: CreateTransactionSchemaType) {
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
        },
        membership.role,
      );
      revalidateHousehold(household.id, [
        CACHE_RESOURCE.transactions,
        CACHE_RESOURCE.balances,
        CACHE_RESOURCE.budgets,
        CACHE_RESOURCE.goals,
        CACHE_RESOURCE.insights,
        CACHE_RESOURCE.history,
      ]);
    },
  );
}
