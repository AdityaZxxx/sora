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
  writeTransaction,
  type TransactionWriteInput,
} from "@/lib/transactions";
import { TransactionDraftSchema } from "@/schemas/transaction";

export type CreateTransactionActionInput = Omit<
  TransactionWriteInput,
  "addedVia"
>;

const USER_FACING_ERROR =
  "Unable to add the transaction. Check the amount, category and date, then try again.";

export async function CreateTransaction(form: CreateTransactionActionInput) {
  return withWalletAction(USER_FACING_ERROR, async ({ caller }) => {
    await writeTransaction(caller, {
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
    schema: TransactionDraftSchema,
    fallback: USER_FACING_ERROR,
    success: "Transaction added",
    run: (input) =>
      withWalletAction(USER_FACING_ERROR, async ({ caller }) => {
        await writeTransaction(caller, {
          ...input,
          idempotencyKey:
            formOptionalText(formData, "idempotencyKey") ??
            globalThis.crypto.randomUUID(),
        });
      }),
  });
}

const UPDATE_ERROR =
  "Unable to update the transaction. Check the amount, category and date, then try again.";

function updateFields(formData: FormData) {
  return {
    id: formText(formData, "id"),
    ...transactionFields(formData),
  };
}

export async function updateTransactionForm(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  return submitFormAction({
    formData,
    fields: updateFields,
    schema: TransactionDraftSchema,
    fallback: UPDATE_ERROR,
    success: "Transaction updated",
    run: (input) =>
      withWalletAction(UPDATE_ERROR, async ({ caller }) => {
        await writeTransaction(caller, {
          ...input,
          goalId: input.goalId || undefined,
        });
      }),
  });
}
