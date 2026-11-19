"use server";

import type { DeleteIdSchemaType } from "@/schemas/delete";

import { withHouseholdAction } from "@/lib/action-result";
import { CACHE_RESOURCE, revalidateHousehold } from "@/lib/cache";
import { deleteTransaction } from "@/lib/transactions";

export async function DeleteTransaction(form: DeleteIdSchemaType) {
  return withHouseholdAction(
    "Unable to delete the transaction. Refresh the page and try again.",
    async ({ household, membership }) => {
      await deleteTransaction(household.id, form.id, membership.role);
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
