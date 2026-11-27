"use server";

import { withWalletAction } from "@/lib/action-result";
import {
  createWalletBudget,
  deleteWalletBudget,
  updateWalletBudget,
} from "@/lib/budgets";
import {
  formText,
  idField,
  submitFormAction,
  type FormActionState,
} from "@/lib/form-action";
import { CreateBudgetSchema, UpdateBudgetSchema } from "@/schemas/budgets";
import { DeleteIdSchema } from "@/schemas/delete";

const CREATE_ERROR =
  "Unable to create the budget. Select a category and enter a valid amount, then try again.";
const UPDATE_ERROR =
  "Unable to update the budget. Select a category and enter a valid amount, then try again.";
const DELETE_ERROR =
  "Unable to delete the budget. Check the budget and try again.";

function budgetFields(formData: FormData) {
  return {
    category: formText(formData, "category"),
    amount: formText(formData, "amount"),
    mode: formText(formData, "mode"),
  };
}

export async function createBudgetForm(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  return submitFormAction({
    formData,
    fields: budgetFields,
    schema: CreateBudgetSchema,
    fallback: CREATE_ERROR,
    success: "Budget added",
    run: (input) =>
      withWalletAction(CREATE_ERROR, async ({ caller }) => {
        const created = await createWalletBudget(caller, input);
        return created;
      }),
  });
}

export async function updateBudgetForm(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  return submitFormAction({
    formData,
    fields: (data) => ({ ...idField(data), ...budgetFields(data) }),
    schema: UpdateBudgetSchema,
    fallback: UPDATE_ERROR,
    success: "Budget updated",
    run: (input) =>
      withWalletAction(UPDATE_ERROR, async ({ caller }) => {
        const updated = await updateWalletBudget(caller, input);
        return updated;
      }),
  });
}

export async function deleteBudgetForm(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  return submitFormAction({
    formData,
    fields: idField,
    schema: DeleteIdSchema,
    fallback: DELETE_ERROR,
    success: "Budget deleted",
    run: (input) =>
      withWalletAction(DELETE_ERROR, async ({ caller }) => {
        await deleteWalletBudget(caller, input.id);
      }),
  });
}
