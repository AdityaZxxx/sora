"use server";

import type { DeleteIdSchemaType } from "@/schemas/delete";
import type {
  CreateGoalSchemaType,
  UpdateGoalSchemaType,
} from "@/schemas/goals";

import { withHouseholdAction } from "@/lib/action-result";
import { CACHE_RESOURCE, revalidateHousehold } from "@/lib/cache";
import {
  fieldErrorsFromIssues,
  formDate,
  formError,
  formText,
  fromActionResult,
  type FormActionState,
} from "@/lib/form-action";
import {
  createHouseholdGoal,
  deleteHouseholdGoal,
  updateHouseholdGoal,
} from "@/lib/goals";
import { DeleteIdSchema } from "@/schemas/delete";
import { CreateGoalSchema, UpdateGoalSchema } from "@/schemas/goals";

export async function createGoal(form: CreateGoalSchemaType) {
  return withHouseholdAction(
    "Unable to create the goal. Check the name and target amount, then try again.",
    async ({ caller }) => {
      const created = await createHouseholdGoal(caller, form);
      revalidateHousehold(caller.householdId, [CACHE_RESOURCE.goals]);
      return created;
    },
  );
}

export async function updateGoal(form: UpdateGoalSchemaType) {
  return withHouseholdAction(
    "Unable to update the goal. Check the name and target amount, then try again.",
    async ({ caller }) => {
      const updated = await updateHouseholdGoal(caller, form);
      revalidateHousehold(caller.householdId, [CACHE_RESOURCE.goals]);
      return updated;
    },
  );
}

export async function deleteGoal(form: DeleteIdSchemaType) {
  return withHouseholdAction(
    "Unable to delete the goal. Check the goal and try again.",
    async ({ caller }) => {
      const deleted = await deleteHouseholdGoal(caller, form.id);
      revalidateHousehold(caller.householdId, [CACHE_RESOURCE.goals]);
      return deleted;
    },
  );
}

export async function createGoalForm(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const parsed = CreateGoalSchema.safeParse({
    name: formText(formData, "name"),
    target: formText(formData, "target"),
    deadline: formDate(formData, "deadline"),
  });
  if (!parsed.success) {
    return formError(
      "Unable to create the goal. Check the name and target amount, then try again.",
      fieldErrorsFromIssues(parsed.error.issues),
    );
  }
  return fromActionResult(await createGoal(parsed.data), "Goal added");
}

export async function updateGoalForm(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const parsed = UpdateGoalSchema.safeParse({
    id: formText(formData, "id"),
    name: formText(formData, "name"),
    target: formText(formData, "target"),
    deadline: formDate(formData, "deadline") ?? null,
  });
  if (!parsed.success) {
    return formError(
      "Unable to update the goal. Check the name and target amount, then try again.",
      fieldErrorsFromIssues(parsed.error.issues),
    );
  }
  return fromActionResult(await updateGoal(parsed.data), "Goal updated");
}

export async function deleteGoalForm(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const parsed = DeleteIdSchema.safeParse({ id: formText(formData, "id") });
  if (!parsed.success) {
    return formError(
      "Unable to delete the goal. Check the goal and try again.",
      fieldErrorsFromIssues(parsed.error.issues),
    );
  }
  return fromActionResult(await deleteGoal(parsed.data), "Goal deleted");
}
