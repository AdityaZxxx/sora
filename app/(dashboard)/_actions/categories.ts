"use server";

import type {
  CreateCategorySchemaType,
  UpdateCategorySchemaType,
} from "@/schemas/categories";
import type { DeleteIdSchemaType } from "@/schemas/delete";

import { withHouseholdAction } from "@/lib/action-result";
import { CACHE_RESOURCE, revalidateHousehold } from "@/lib/cache";
import {
  createHouseholdCategory,
  deleteHouseholdCategory,
  updateHouseholdCategory,
} from "@/lib/categories";

export async function CreateCategory(form: CreateCategorySchemaType) {
  return withHouseholdAction(
    "Unable to create the category. Check the name and icon, then try again.",
    async ({ caller }) => {
      const created = await createHouseholdCategory(caller, form);
      revalidateHousehold(caller.householdId, [CACHE_RESOURCE.categories]);
      return created;
    },
  );
}

export async function UpdateCategory(form: UpdateCategorySchemaType) {
  return withHouseholdAction(
    "Unable to update the category. Check the name and icon, then try again.",
    async ({ caller }) => {
      const updated = await updateHouseholdCategory(caller, form);
      revalidateHousehold(caller.householdId, [
        CACHE_RESOURCE.categories,
        CACHE_RESOURCE.transactions,
        CACHE_RESOURCE.budgets,
        CACHE_RESOURCE.recurring,
      ]);
      return updated;
    },
  );
}

export async function DeleteCategory(form: DeleteIdSchemaType) {
  return withHouseholdAction(
    "Unable to delete the category. Check the category and try again.",
    async ({ caller }) => {
      const deleted = await deleteHouseholdCategory(caller, form.id);
      revalidateHousehold(caller.householdId, [CACHE_RESOURCE.categories]);
      return deleted;
    },
  );
}
