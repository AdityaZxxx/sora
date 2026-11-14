"use server";

import type { DeleteIdSchemaType } from "@/schemas/delete";
import type {
  CreateGoalSchemaType,
  UpdateGoalSchemaType,
} from "@/schemas/goals";

import { redirect } from "next/navigation";

import {
  createHouseholdGoal,
  deleteHouseholdGoal,
  getGoalsWithProgress,
  updateHouseholdGoal,
} from "@/lib/goals";
import { requireHousehold } from "@/lib/household";
import { DeleteIdSchema } from "@/schemas/delete";
import { CreateGoalSchema, UpdateGoalSchema } from "@/schemas/goals";

export async function listGoals() {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  return await getGoalsWithProgress(result.household.id);
}

export async function createGoal(form: CreateGoalSchemaType) {
  const parsedBody = CreateGoalSchema.safeParse(form);
  if (!parsedBody.success) {
    throw new Error("Bad request");
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  return await createHouseholdGoal(
    result.household.id,
    parsedBody.data,
    result.membership.role,
  );
}

export async function updateGoal(form: UpdateGoalSchemaType) {
  const parsedBody = UpdateGoalSchema.safeParse(form);
  if (!parsedBody.success) {
    throw new Error("Bad request");
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  return await updateHouseholdGoal(
    result.household.id,
    parsedBody.data,
    result.membership.role,
  );
}

export async function deleteGoal(form: DeleteIdSchemaType) {
  const parsedBody = DeleteIdSchema.safeParse(form);
  if (!parsedBody.success) {
    throw new Error(parsedBody.error.issues[0]?.message ?? "Bad request");
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  return await deleteHouseholdGoal(
    result.household.id,
    parsedBody.data.id,
    result.membership.role,
  );
}
