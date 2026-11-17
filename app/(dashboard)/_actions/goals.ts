"use server";

import type { DeleteIdSchemaType } from "@/schemas/delete";
import type {
  CreateGoalSchemaType,
  UpdateGoalSchemaType,
} from "@/schemas/goals";

import { withHouseholdAction } from "@/lib/action-result";
import {
  createHouseholdGoal,
  deleteHouseholdGoal,
  getGoalsWithProgress,
  updateHouseholdGoal,
} from "@/lib/goals";

export async function listGoals() {
  return withHouseholdAction(
    "Unable to load the goals. Refresh the page and try again.",
    ({ household }) => getGoalsWithProgress(household.id),
  );
}

export async function createGoal(form: CreateGoalSchemaType) {
  return withHouseholdAction(
    "Unable to create the goal. Check the name and target amount, then try again.",
    ({ household, membership }) =>
      createHouseholdGoal(household.id, form, membership.role),
  );
}

export async function updateGoal(form: UpdateGoalSchemaType) {
  return withHouseholdAction(
    "Unable to update the goal. Check the name and target amount, then try again.",
    ({ household, membership }) =>
      updateHouseholdGoal(household.id, form, membership.role),
  );
}

export async function deleteGoal(form: DeleteIdSchemaType) {
  return withHouseholdAction(
    "Unable to delete the goal. Check the goal and try again.",
    ({ household, membership }) =>
      deleteHouseholdGoal(household.id, form.id, membership.role),
  );
}
