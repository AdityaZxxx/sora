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
import {
  fieldErrorsFromIssues,
  formError,
  formOptionalText,
  formText,
  fromActionResult,
  type FormActionState,
} from "@/lib/form-action";
import {
  CreateCategorySchema,
  UpdateCategorySchema,
} from "@/schemas/categories";
import { DeleteIdSchema } from "@/schemas/delete";

export async function CreateCategory(form: CreateCategorySchemaType) {
  return withHouseholdAction(
    "Unable to create the category. Check the name and icon, then try again.",
    async ({ caller }) => {
      return createHouseholdCategory(caller, form);
    },
  );
}

export async function UpdateCategory(form: UpdateCategorySchemaType) {
  return withHouseholdAction(
    "Unable to update the category. Check the name and icon, then try again.",
    async ({ caller }) => {
      return updateHouseholdCategory(caller, form);
    },
  );
}

export async function DeleteCategory(form: DeleteIdSchemaType) {
  return withHouseholdAction(
    "Unable to delete the category. Check the category and try again.",
    async ({ caller }) => {
      return deleteHouseholdCategory(caller, form.id);
    },
  );
}

function categoryFields(formData: FormData) {
  return {
    name: formText(formData, "name"),
    type: formText(formData, "type"),
    icon: formText(formData, "icon"),
    iconKind: formText(formData, "iconKind"),
    iconColor: formOptionalText(formData, "iconColor") ?? null,
  };
}

export async function createCategoryForm(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const parsed = CreateCategorySchema.safeParse(categoryFields(formData));
  if (!parsed.success) {
    return formError(
      "Unable to create the category. Check the name and icon, then try again.",
      fieldErrorsFromIssues(parsed.error.issues),
    );
  }
  return fromActionResult(await CreateCategory(parsed.data), "Category added");
}

export async function updateCategoryForm(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const parsed = UpdateCategorySchema.safeParse({
    originalName: formText(formData, "originalName"),
    ...categoryFields(formData),
  });
  if (!parsed.success) {
    return formError(
      "Unable to update the category. Check the name and icon, then try again.",
      fieldErrorsFromIssues(parsed.error.issues),
    );
  }
  return fromActionResult(
    await UpdateCategory(parsed.data),
    "Category updated",
  );
}

export async function deleteCategoryForm(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const parsed = DeleteIdSchema.safeParse({ id: formText(formData, "id") });
  if (!parsed.success) {
    return formError(
      "Unable to delete the category. Check the category and try again.",
      fieldErrorsFromIssues(parsed.error.issues),
    );
  }
  return fromActionResult(
    await DeleteCategory(parsed.data),
    "Category deleted",
  );
}
