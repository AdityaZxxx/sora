"use server";

import type {
  CreateCategorySchemaType,
  UpdateCategorySchemaType,
} from "@/schemas/categories";
import type { DeleteIdSchemaType } from "@/schemas/delete";

import { redirect } from "next/navigation";

import { ok, fail } from "@/lib/action-result";
import {
  createHouseholdCategory,
  deleteHouseholdCategory,
  updateHouseholdCategory,
} from "@/lib/categories";
import { DomainError } from "@/lib/errors";
import { requireHousehold } from "@/lib/household";
import { firstIssueMessage } from "@/lib/issue-message";

export async function CreateCategory(form: CreateCategorySchemaType) {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  try {
    return ok(
      await createHouseholdCategory(
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
          "Unable to create the category. Check the name and icon, then try again.",
        ),
      );
    }
    throw cause;
  }
}

export async function UpdateCategory(form: UpdateCategorySchemaType) {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  try {
    return ok(
      await updateHouseholdCategory(
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
          "Unable to update the category. Check the name and icon, then try again.",
        ),
      );
    }
    throw cause;
  }
}

export async function DeleteCategory(form: DeleteIdSchemaType) {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  try {
    return ok(
      await deleteHouseholdCategory(
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
          "Unable to delete the category. Check the category and try again.",
        ),
      );
    }
    throw cause;
  }
}
