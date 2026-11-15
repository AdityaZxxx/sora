"use server";

import type { DeleteIdSchemaType } from "@/schemas/delete";
import type {
  CreateGoalSchemaType,
  UpdateGoalSchemaType,
} from "@/schemas/goals";

import { redirect } from "next/navigation";

import { ok, fail } from "@/lib/action-result";
import { DomainError } from "@/lib/errors";
import {
  createHouseholdGoal,
  deleteHouseholdGoal,
  getGoalsWithProgress,
  updateHouseholdGoal,
} from "@/lib/goals";
import { requireHousehold } from "@/lib/household";
import { firstIssueMessage } from "@/lib/issue-message";

export async function listGoals() {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  try {
    return ok(await getGoalsWithProgress(result.household.id));
  } catch (cause) {
    if (cause instanceof DomainError) {
      return fail(
        firstIssueMessage(
          cause.message,
          "Unable to load the goals. Refresh the page and try again.",
        ),
      );
    }
    throw cause;
  }
}

export async function createGoal(form: CreateGoalSchemaType) {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  try {
    return ok(
      await createHouseholdGoal(
        result.household.id,
        form,
        result.membership.role,
      ),
    );
  } catch (cause) {
    if (cause instanceof DomainError) {
      return fail(
        firstIssueMessage(
          cause.message,
          "Unable to create the goal. Check the name and target amount, then try again.",
        ),
      );
    }
    throw cause;
  }
}

export async function updateGoal(form: UpdateGoalSchemaType) {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  try {
    return ok(
      await updateHouseholdGoal(
        result.household.id,
        form,
        result.membership.role,
      ),
    );
  } catch (cause) {
    if (cause instanceof DomainError) {
      return fail(
        firstIssueMessage(
          cause.message,
          "Unable to update the goal. Check the name and target amount, then try again.",
        ),
      );
    }
    throw cause;
  }
}

export async function deleteGoal(form: DeleteIdSchemaType) {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  try {
    return ok(
      await deleteHouseholdGoal(
        result.household.id,
        form.id,
        result.membership.role,
      ),
    );
  } catch (cause) {
    if (cause instanceof DomainError) {
      return fail(
        firstIssueMessage(
          cause.message,
          "Unable to delete the goal. Check the goal and try again.",
        ),
      );
    }
    throw cause;
  }
}
