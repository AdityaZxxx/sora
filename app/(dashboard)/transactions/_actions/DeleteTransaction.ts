"use server";

import type { DeleteIdSchemaType } from "@/schemas/delete";

import { withHouseholdAction } from "@/lib/action-result";
import { deleteTransaction } from "@/lib/transactions";

export async function DeleteTransaction(form: DeleteIdSchemaType) {
  return withHouseholdAction(
    "Unable to delete the transaction. Refresh the page and try again.",
    async ({ caller }) => {
      await deleteTransaction(caller, form.id);
    },
  );
}
