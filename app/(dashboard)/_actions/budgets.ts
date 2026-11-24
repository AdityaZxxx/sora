"use server";

import type {
  CreateBudgetSchemaType,
  UpdateBudgetSchemaType,
} from "@/schemas/budgets";
import type { DeleteIdSchemaType } from "@/schemas/delete";

import { withHouseholdAction } from "@/lib/action-result";
import {
  createHouseholdBudget,
  deleteHouseholdBudget,
  updateHouseholdBudget,
} from "@/lib/budgets";
import { CACHE_RESOURCE, revalidateHousehold } from "@/lib/cache";
import {
  fieldErrorsFromIssues,
  formError,
  formText,
  fromActionResult,
  type FormActionState,
} from "@/lib/form-action";
import { CreateBudgetSchema, UpdateBudgetSchema } from "@/schemas/budgets";
import { DeleteIdSchema } from "@/schemas/delete";

export async function createBudget(form: CreateBudgetSchemaType) {
  return withHouseholdAction(
    "Unable to create the budget. Select a category and enter a valid amount, then try again.",
    async ({ caller }) => {
      const created = await createHouseholdBudget(caller, form);
      revalidateHousehold(caller.householdId, [CACHE_RESOURCE.budgets]);
      return created;
    },
  );
}

export async function updateBudget(form: UpdateBudgetSchemaType) {
  return withHouseholdAction(
    "Unable to update the budget. Select a category and enter a valid amount, then try again.",
    async ({ caller }) => {
      const updated = await updateHouseholdBudget(caller, form);
      revalidateHousehold(caller.householdId, [CACHE_RESOURCE.budgets]);
      return updated;
    },
  );
}

export async function deleteBudget(form: DeleteIdSchemaType) {
  return withHouseholdAction(
    "Unable to delete the budget. Check the budget and try again.",
    async ({ caller }) => {
      const deleted = await deleteHouseholdBudget(caller, form.id);
      revalidateHousehold(caller.householdId, [CACHE_RESOURCE.budgets]);
      return deleted;
    },
  );
}

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
  const parsed = CreateBudgetSchema.safeParse(budgetFields(formData));
  if (!parsed.success) {
    return formError(
      "Unable to create the budget. Select a category and enter a valid amount, then try again.",
      fieldErrorsFromIssues(parsed.error.issues),
    );
  }
  return fromActionResult(await createBudget(parsed.data), "Budget added");
}

export async function updateBudgetForm(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const parsed = UpdateBudgetSchema.safeParse({
    id: formText(formData, "id"),
    ...budgetFields(formData),
  });
  if (!parsed.success) {
    return formError(
      "Unable to update the budget. Select a category and enter a valid amount, then try again.",
      fieldErrorsFromIssues(parsed.error.issues),
    );
  }
  return fromActionResult(await updateBudget(parsed.data), "Budget updated");
}

export async function deleteBudgetForm(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const parsed = DeleteIdSchema.safeParse({ id: formText(formData, "id") });
  if (!parsed.success) {
    return formError(
      "Unable to delete the budget. Check the budget and try again.",
      fieldErrorsFromIssues(parsed.error.issues),
    );
  }
  return fromActionResult(await deleteBudget(parsed.data), "Budget deleted");
}
