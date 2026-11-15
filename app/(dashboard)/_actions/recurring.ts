"use server";

import type { DeleteIdSchemaType } from "@/schemas/delete";
import type {
  CreateRecurringItemType,
  UpdateRecurringItemType,
} from "@/schemas/recurring";

import { redirect } from "next/navigation";

import { ok, fail } from "@/lib/action-result";
import { DomainError } from "@/lib/errors";
import { requireHousehold } from "@/lib/household";
import { firstIssueMessage } from "@/lib/issue-message";
import {
  createRecurringItem,
  deleteRecurringItem,
  listRecurringItems,
  setRecurringItemPaused,
  updateRecurringItem,
} from "@/lib/recurring";

export async function listRecurringItemsAction() {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  try {
    return ok(await listRecurringItems(result.household.id));
  } catch (cause) {
    if (cause instanceof DomainError) {
      return fail(
        firstIssueMessage(
          cause.message,
          "Unable to load the bills. Refresh the page and try again.",
        ),
      );
    }
    throw cause;
  }
}

export async function CreateRecurringItem(form: CreateRecurringItemType) {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  try {
    await createRecurringItem(
      result.household.id,
      form,
      result.membership.role,
    );
  } catch (cause) {
    if (cause instanceof DomainError) {
      return fail(
        firstIssueMessage(
          cause.message,
          "Unable to add the bill. Check the name, amount and category, then try again.",
        ),
      );
    }
    throw cause;
  }
  return ok();
}

export async function UpdateRecurringItem(form: UpdateRecurringItemType) {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  try {
    await updateRecurringItem(
      result.household.id,
      form,
      result.membership.role,
    );
  } catch (cause) {
    if (cause instanceof DomainError) {
      return fail(
        firstIssueMessage(
          cause.message,
          "Unable to update the bill. Check the name, amount and category, then try again.",
        ),
      );
    }
    throw cause;
  }
  return ok();
}

export async function SetRecurringItemPaused(form: {
  id: string;
  paused: boolean;
}) {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  try {
    await setRecurringItemPaused(
      result.household.id,
      form.id,
      form.paused,
      result.membership.role,
    );
  } catch (cause) {
    if (cause instanceof DomainError) {
      return fail(
        firstIssueMessage(
          cause.message,
          "Unable to update the bill. Check the bill and try again.",
        ),
      );
    }
    throw cause;
  }
  return ok();
}

export async function DeleteRecurringItem(form: DeleteIdSchemaType) {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  try {
    await deleteRecurringItem(
      result.household.id,
      form.id,
      result.membership.role,
    );
  } catch (cause) {
    if (cause instanceof DomainError) {
      return fail(
        firstIssueMessage(
          cause.message,
          "Unable to delete the bill. Check the bill and try again.",
        ),
      );
    }
    throw cause;
  }
  return ok();
}
