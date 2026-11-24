"use server";

import { withHouseholdAction } from "@/lib/action-result";
import {
  fieldErrorsFromIssues,
  formDate,
  formError,
  formFlag,
  formOptionalText,
  formText,
  fromActionResult,
  type FormActionState,
} from "@/lib/form-action";
import {
  createTransaction,
  type CreateTransactionInput,
} from "@/lib/transactions";
import { CreateTransactionSchema } from "@/schemas/transaction";

export type CreateTransactionActionInput = Omit<
  CreateTransactionInput,
  "addedVia"
>;

const FALLBACK =
  "Unable to add the transaction. Check the amount, category and date, then try again.";

export async function CreateTransaction(form: CreateTransactionActionInput) {
  return withHouseholdAction(FALLBACK, async ({ caller }) => {
    await createTransaction(caller, {
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
    });
  });
}

export async function createTransactionForm(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const sharesText = formOptionalText(formData, "shares");
  let shares: unknown;
  if (sharesText) {
    try {
      shares = JSON.parse(sharesText);
    } catch {
      shares = sharesText;
    }
  }

  const parsed = CreateTransactionSchema.safeParse({
    amount: formText(formData, "amount"),
    description: formOptionalText(formData, "description"),
    category: formText(formData, "category"),
    type: formText(formData, "type"),
    date: formDate(formData, "date"),
    shared: formFlag(formData, "shared"),
    goalId: formOptionalText(formData, "goalId"),
    shares,
    recurringItemId: formOptionalText(formData, "recurringItemId"),
  });

  if (!parsed.success) {
    return formError(FALLBACK, fieldErrorsFromIssues(parsed.error.issues));
  }

  const result = await CreateTransaction({
    ...parsed.data,
    idempotencyKey:
      formOptionalText(formData, "idempotencyKey") ??
      globalThis.crypto.randomUUID(),
  });
  return fromActionResult(result, "Transaction added");
}
