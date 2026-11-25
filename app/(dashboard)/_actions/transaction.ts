"use server";

import { withWalletAction } from "@/lib/action-result";
import {
  formDate,
  formOptionalText,
  formText,
  submitFormAction,
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

const USER_FACING_ERROR =
  "Unable to add the transaction. Check the amount, category and date, then try again.";

export async function CreateTransaction(form: CreateTransactionActionInput) {
  return withWalletAction(USER_FACING_ERROR, async ({ caller }) => {
    await createTransaction(caller, {
      amount: form.amount,
      category: form.category,
      description: form.description,
      date: form.date,
      type: form.type,
      goalId: form.goalId || undefined,
      shares: form.shares,
      recurringItemId: form.recurringItemId,
      idempotencyKey: form.idempotencyKey,
    });
  });
}

function transactionFields(formData: FormData) {
  const sharesText = formOptionalText(formData, "shares");
  let shares: unknown;
  if (sharesText) {
    try {
      shares = JSON.parse(sharesText);
    } catch {
      shares = sharesText;
    }
  }

  return {
    amount: formText(formData, "amount"),
    description: formOptionalText(formData, "description"),
    category: formText(formData, "category"),
    type: formText(formData, "type"),
    date: formDate(formData, "date"),
    goalId: formOptionalText(formData, "goalId"),
    shares,
    recurringItemId: formOptionalText(formData, "recurringItemId"),
  };
}

export async function createTransactionForm(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  return submitFormAction({
    formData,
    fields: transactionFields,
    schema: CreateTransactionSchema,
    fallback: USER_FACING_ERROR,
    success: "Transaction added",
    run: (input) =>
      withWalletAction(USER_FACING_ERROR, async ({ caller }) => {
        await createTransaction(caller, {
          ...input,
          idempotencyKey:
            formOptionalText(formData, "idempotencyKey") ??
            globalThis.crypto.randomUUID(),
        });
      }),
  });
}
