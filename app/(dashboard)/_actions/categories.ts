"use server";

import { withWalletAction } from "@/lib/action-result";
import {
  createWalletCategory,
  deleteWalletCategory,
  updateWalletCategory,
} from "@/lib/categories";
import {
  formOptionalText,
  formText,
  idField,
  submitFormAction,
  type FormActionState,
} from "@/lib/form-action";
import {
  CreateCategorySchema,
  UpdateCategorySchema,
} from "@/schemas/categories";
import { DeleteIdSchema } from "@/schemas/delete";

const CREATE_ERROR =
  "Unable to create the category. Check the name and icon, then try again.";
const UPDATE_ERROR =
  "Unable to update the category. Check the name and icon, then try again.";
const DELETE_ERROR =
  "Unable to delete the category. Check the category and try again.";

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
  return submitFormAction({
    formData,
    fields: categoryFields,
    schema: CreateCategorySchema,
    fallback: CREATE_ERROR,
    success: "Category added",
    run: (input) =>
      withWalletAction(CREATE_ERROR, async ({ caller }) => {
        const created = await createWalletCategory(caller, input);
        return created;
      }),
  });
}

export async function updateCategoryForm(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  return submitFormAction({
    formData,
    fields: (data) => ({
      originalName: formText(data, "originalName"),
      ...categoryFields(data),
    }),
    schema: UpdateCategorySchema,
    fallback: UPDATE_ERROR,
    success: "Category updated",
    run: (input) =>
      withWalletAction(UPDATE_ERROR, async ({ caller }) => {
        const updated = await updateWalletCategory(caller, input);
        return updated;
      }),
  });
}

export async function deleteCategoryForm(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  return submitFormAction({
    formData,
    fields: idField,
    schema: DeleteIdSchema,
    fallback: DELETE_ERROR,
    success: "Category deleted",
    run: (input) =>
      withWalletAction(DELETE_ERROR, async ({ caller }) => {
        await deleteWalletCategory(caller, input.id);
      }),
  });
}
