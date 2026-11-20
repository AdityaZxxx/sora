"use server";

import type { DeleteIdSchemaType } from "@/schemas/delete";
import type {
  CreateGoalSchemaType,
  UpdateGoalSchemaType,
} from "@/schemas/goals";

import { withHouseholdAction } from "@/lib/action-result";
import { CACHE_RESOURCE, revalidateHousehold } from "@/lib/cache";
import {
  createHouseholdGoal,
  deleteHouseholdGoal,
  updateHouseholdGoal,
} from "@/lib/goals";

export async function createGoal(form: CreateGoalSchemaType) {
  return withHouseholdAction(
    "Unable to create the goal. Check the name and target amount, then try again.",
    async ({ household, membership }) => {
      const created = await createHouseholdGoal(
        household.id,
        form,
        membership.role,
      );
      revalidateHousehold(household.id, [CACHE_RESOURCE.goals]);
      return created;
    },
  );
}

export async function updateGoal(form: UpdateGoalSchemaType) {
  return withHouseholdAction(
    "Unable to update the goal. Check the name and target amount, then try again.",
    async ({ household, membership }) => {
      const updated = await updateHouseholdGoal(
        household.id,
        form,
        membership.role,
      );
      revalidateHousehold(household.id, [CACHE_RESOURCE.goals]);
      return updated;
    },
  );
}

export async function deleteGoal(form: DeleteIdSchemaType) {
  return withHouseholdAction(
    "Unable to delete the goal. Check the goal and try again.",
    async ({ household, membership }) => {
      const deleted = await deleteHouseholdGoal(
        household.id,
        form.id,
        membership.role,
      );
      revalidateHousehold(household.id, [CACHE_RESOURCE.goals]);
      return deleted;
    },
  );
}
