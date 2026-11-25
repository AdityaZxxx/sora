"use server";

import { withWalletAction } from "@/lib/action-result";
import {
  idField,
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
    fields: idField,
    schema: DeleteIdSchema,
    fallback: USER_FACING_ERROR,
    success: "Transaction deleted",
    run: (input) =>
      withWalletAction(USER_FACING_ERROR, async ({ caller }) => {
        await deleteTransaction(caller, input.id);
      }),
  });
}
