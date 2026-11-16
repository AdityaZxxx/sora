"use server";

import type {
  CreateBudgetSchemaType,
  UpdateBudgetSchemaType,
} from "@/schemas/budgets";
import type { DeleteIdSchemaType } from "@/schemas/delete";

import { type ActionResult, withHouseholdAction } from "@/lib/action-result";
import {
  createHouseholdBudget,
  deleteHouseholdBudget,
  getBudgetsWithProgress,
  type BudgetWithProgress,
  updateHouseholdBudget,
} from "@/lib/budgets";

export async function listBudgets(): Promise<
  ActionResult<BudgetWithProgress[]>
> {
  return withHouseholdAction(
    "Unable to load the budgets. Refresh the page and try again.",
    ({ household }) => getBudgetsWithProgress(household.id),
  );
}

export async function createBudget(form: CreateBudgetSchemaType) {
  return withHouseholdAction(
    "Unable to create the budget. Select a category and enter a valid amount, then try again.",
    ({ household, membership }) =>
      createHouseholdBudget(household.id, form, membership.role),
  );
}

export async function updateBudget(form: UpdateBudgetSchemaType) {
  return withHouseholdAction(
    "Unable to update the budget. Select a category and enter a valid amount, then try again.",
    ({ household, membership }) =>
      updateHouseholdBudget(household.id, form, membership.role),
  );
}

export async function deleteBudget(form: DeleteIdSchemaType) {
  return withHouseholdAction(
    "Unable to delete the budget. Check the budget and try again.",
    ({ household, membership }) =>
      deleteHouseholdBudget(household.id, form.id, membership.role),
  );
}
