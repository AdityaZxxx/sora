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
