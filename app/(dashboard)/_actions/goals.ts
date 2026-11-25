"use server";

import { withHouseholdAction } from "@/lib/action-result";
import { CACHE_RESOURCE, revalidateHousehold } from "@/lib/cache";
import {
  formDate,
  formText,
  submitFormAction,
  type FormActionState,
} from "@/lib/form-action";
import {
  createHouseholdGoal,
  deleteHouseholdGoal,
  updateHouseholdGoal,
} from "@/lib/goals";
import { DeleteIdSchema } from "@/schemas/delete";
import { CreateGoalSchema, UpdateGoalSchema } from "@/schemas/goals";

const CREATE_ERROR =
  "Unable to create the goal. Check the name and target amount, then try again.";
const UPDATE_ERROR =
  "Unable to update the goal. Check the name and target amount, then try again.";
const DELETE_ERROR = "Unable to delete the goal. Check the goal and try again.";

function idField(formData: FormData) {
  return { id: formText(formData, "id") };
}

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
      withHouseholdAction(CREATE_ERROR, async ({ caller }) => {
        const created = await createHouseholdGoal(caller, input);
        revalidateHousehold(caller.householdId, [CACHE_RESOURCE.goals]);
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
      withHouseholdAction(UPDATE_ERROR, async ({ caller }) => {
        const updated = await updateHouseholdGoal(caller, input);
        revalidateHousehold(caller.householdId, [CACHE_RESOURCE.goals]);
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
      withHouseholdAction(DELETE_ERROR, async ({ caller }) => {
        await deleteHouseholdGoal(caller, input.id);
        revalidateHousehold(caller.householdId, [CACHE_RESOURCE.goals]);
      }),
  });
}
