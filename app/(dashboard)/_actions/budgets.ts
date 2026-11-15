"use server";

import type {
  CreateBudgetSchemaType,
  UpdateBudgetSchemaType,
} from "@/schemas/budgets";
import type { DeleteIdSchemaType } from "@/schemas/delete";

import { redirect } from "next/navigation";

import { type ActionResult, ok, fail } from "@/lib/action-result";
import {
  createHouseholdBudget,
  deleteHouseholdBudget,
  getBudgetsWithProgress,
  type BudgetWithProgress,
  updateHouseholdBudget,
} from "@/lib/budgets";
import { DomainError } from "@/lib/errors";
import { requireHousehold } from "@/lib/household";
import { firstIssueMessage } from "@/lib/issue-message";

export async function listBudgets(): Promise<
  ActionResult<BudgetWithProgress[]>
> {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  return ok(await getBudgetsWithProgress(result.household.id));
}

export async function createBudget(form: CreateBudgetSchemaType) {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  try {
    return ok(
      await createHouseholdBudget(
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
          "Unable to create the budget. Select a category and enter a valid amount, then try again.",
        ),
      );
    }
    throw cause;
  }
}

export async function updateBudget(form: UpdateBudgetSchemaType) {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  try {
    return ok(
      await updateHouseholdBudget(
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
          "Unable to update the budget. Select a category and enter a valid amount, then try again.",
        ),
      );
    }
    throw cause;
  }
}

export async function deleteBudget(form: DeleteIdSchemaType) {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  try {
    return ok(
      await deleteHouseholdBudget(
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
          "Unable to delete the budget. Check the budget and try again.",
        ),
      );
    }
    throw cause;
  }
}
