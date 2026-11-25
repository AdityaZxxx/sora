"use server";

import { withHouseholdAction } from "@/lib/action-result";
import {
  formText,
  submitFormAction,
  type FormActionState,
} from "@/lib/form-action";
import { deleteTransaction } from "@/lib/transactions";
import { DeleteIdSchema } from "@/schemas/delete";

const USER_FACING_ERROR =
  "Unable to delete the transaction. Refresh the page and try again.";

export async function deleteTransactionForm(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  return submitFormAction({
    formData,
    fields: (data) => ({ id: formText(data, "id") }),
    schema: DeleteIdSchema,
    fallback: USER_FACING_ERROR,
    success: "Transaction deleted",
    run: (input) =>
      withHouseholdAction(USER_FACING_ERROR, async ({ caller }) => {
        await deleteTransaction(caller, input.id);
      }),
  });
}
