"use server";

import type { DeleteIdSchemaType } from "@/schemas/delete";

import { withHouseholdAction } from "@/lib/action-result";
import {
  fieldErrorsFromIssues,
  formError,
  formText,
  fromActionResult,
  type FormActionState,
} from "@/lib/form-action";
import { deleteTransaction } from "@/lib/transactions";
import { DeleteIdSchema } from "@/schemas/delete";

const FALLBACK =
  "Unable to delete the transaction. Refresh the page and try again.";

export async function DeleteTransaction(form: DeleteIdSchemaType) {
  return withHouseholdAction(FALLBACK, async ({ caller }) => {
    await deleteTransaction(caller, form.id);
  });
}

export async function deleteTransactionForm(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const parsed = DeleteIdSchema.safeParse({ id: formText(formData, "id") });
  if (!parsed.success) {
    return formError(FALLBACK, fieldErrorsFromIssues(parsed.error.issues));
  }
  return fromActionResult(
    await DeleteTransaction(parsed.data),
    "Transaction deleted",
  );
}
