"use server";

import type {
  CreateCategorySchemaType,
  UpdateCategorySchemaType,
} from "@/schemas/categories";
import type { DeleteIdSchemaType } from "@/schemas/delete";

import { withHouseholdAction } from "@/lib/action-result";
import {
  createHouseholdCategory,
  deleteHouseholdCategory,
  updateHouseholdCategory,
} from "@/lib/categories";

export async function CreateCategory(form: CreateCategorySchemaType) {
  return withHouseholdAction(
    "Unable to create the category. Check the name and icon, then try again.",
    async ({ caller }) => {
      return await createHouseholdCategory(caller, form);
    },
  );
}

export async function UpdateCategory(form: UpdateCategorySchemaType) {
  return withHouseholdAction(
    "Unable to update the category. Check the name and icon, then try again.",
    async ({ caller }) => {
      return await updateHouseholdCategory(caller, form);
    },
  );
}

export async function DeleteCategory(form: DeleteIdSchemaType) {
  return withHouseholdAction(
    "Unable to delete the category. Check the category and try again.",
    async ({ caller }) => {
      return await deleteHouseholdCategory(caller, form.id);
    },
  );
}
