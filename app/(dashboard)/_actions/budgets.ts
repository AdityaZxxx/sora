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

export async function createBudget(form: CreateBudgetSchemaType) {
  return withHouseholdAction(
    "Unable to create the budget. Select a category and enter a valid amount, then try again.",
    async ({ household, membership }) => {
      const created = await createHouseholdBudget(
        household.id,
        form,
        membership.role,
      );
      revalidateHousehold(household.id, [CACHE_RESOURCE.budgets]);
      return created;
    },
  );
}

export async function updateBudget(form: UpdateBudgetSchemaType) {
  return withHouseholdAction(
    "Unable to update the budget. Select a category and enter a valid amount, then try again.",
    async ({ household, membership }) => {
      const updated = await updateHouseholdBudget(
        household.id,
        form,
        membership.role,
      );
      revalidateHousehold(household.id, [CACHE_RESOURCE.budgets]);
      return updated;
    },
  );
}

export async function deleteBudget(form: DeleteIdSchemaType) {
  return withHouseholdAction(
    "Unable to delete the budget. Check the budget and try again.",
    async ({ household, membership }) => {
      const deleted = await deleteHouseholdBudget(
        household.id,
        form.id,
        membership.role,
      );
      revalidateHousehold(household.id, [CACHE_RESOURCE.budgets]);
      return deleted;
    },
  );
}
