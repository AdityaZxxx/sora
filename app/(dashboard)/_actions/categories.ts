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
    ({ household, membership }) =>
      createHouseholdCategory(household.id, form, membership.role),
  );
}

export async function UpdateCategory(form: UpdateCategorySchemaType) {
  return withHouseholdAction(
    "Unable to update the category. Check the name and icon, then try again.",
    ({ household, membership }) =>
      updateHouseholdCategory(household.id, form, membership.role),
  );
}

export async function DeleteCategory(form: DeleteIdSchemaType) {
  return withHouseholdAction(
    "Unable to delete the category. Check the category and try again.",
    ({ household, membership }) =>
      deleteHouseholdCategory(household.id, form.id, membership.role),
  );
}
