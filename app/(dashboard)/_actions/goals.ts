"use server";

import { withWalletAction } from "@/lib/action-result";
import {
  formDate,
  formText,
  idField,
  submitFormAction,
  type FormActionState,
} from "@/lib/form-action";
import {
  createWalletGoal,
  deleteWalletGoal,
  updateWalletGoal,
} from "@/lib/goals";
import { DeleteIdSchema } from "@/schemas/delete";
import { CreateGoalSchema, UpdateGoalSchema } from "@/schemas/goals";

const CREATE_ERROR =
  "Unable to create the goal. Check the name and target amount, then try again.";
const UPDATE_ERROR =
  "Unable to update the goal. Check the name and target amount, then try again.";
const DELETE_ERROR = "Unable to delete the goal. Check the goal and try again.";

export async function createGoalForm(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  return submitFormAction({
    formData,
    fields: (data) => ({
      name: formText(data, "name"),
      target: formText(data, "target"),
      deadline: formDate(data, "deadline"),
    }),
    schema: CreateGoalSchema,
    fallback: CREATE_ERROR,
    success: "Goal added",
    run: (input) =>
      withWalletAction(CREATE_ERROR, async ({ caller }) => {
        const created = await createWalletGoal(caller, input);
        return created;
      }),
  });
}

export async function updateGoalForm(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  return submitFormAction({
    formData,
    fields: (data) => ({
      ...idField(data),
      name: formText(data, "name"),
      target: formText(data, "target"),
      deadline: formDate(data, "deadline") ?? null,
    }),
    schema: UpdateGoalSchema,
    fallback: UPDATE_ERROR,
    success: "Goal updated",
    run: (input) =>
      withWalletAction(UPDATE_ERROR, async ({ caller }) => {
        const updated = await updateWalletGoal(caller, input);
        return updated;
      }),
  });
}

export async function deleteGoalForm(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  return submitFormAction({
    formData,
    fields: idField,
    schema: DeleteIdSchema,
    fallback: DELETE_ERROR,
    success: "Goal deleted",
    run: (input) =>
      withWalletAction(DELETE_ERROR, async ({ caller }) => {
        await deleteWalletGoal(caller, input.id);
      }),
  });
}
