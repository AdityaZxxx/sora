"use server";

import type { DeleteIdSchemaType } from "@/schemas/delete";

import { withHouseholdAction } from "@/lib/action-result";
import { CACHE_RESOURCE, revalidateHousehold } from "@/lib/cache";
import { deleteTransaction } from "@/lib/transactions";

export async function DeleteTransaction(form: DeleteIdSchemaType) {
  return withHouseholdAction(
    "Unable to delete the transaction. Refresh the page and try again.",
    async ({ caller }) => {
      await deleteTransaction(caller, form.id);
      revalidateHousehold(caller.householdId, [
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
