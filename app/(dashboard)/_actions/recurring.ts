"use server";

import type { DeleteIdSchemaType } from "@/schemas/delete";
import type {
  CreateRecurringItemType,
  UpdateRecurringItemType,
} from "@/schemas/recurring";

import { withHouseholdAction } from "@/lib/action-result";
import {
  createRecurringItem,
  deleteRecurringItem,
  listRecurringItems,
  setRecurringItemPaused,
  updateRecurringItem,
} from "@/lib/recurring";

export async function listRecurringItemsAction() {
  return withHouseholdAction(
    "Unable to load the bills. Refresh the page and try again.",
    ({ household }) => listRecurringItems(household.id),
  );
}

export async function CreateRecurringItem(form: CreateRecurringItemType) {
  return withHouseholdAction(
    "Unable to add the bill. Check the name, amount and category, then try again.",
    async ({ household, membership }) => {
      await createRecurringItem(household.id, form, membership.role);
    },
  );
}

export async function UpdateRecurringItem(form: UpdateRecurringItemType) {
  return withHouseholdAction(
    "Unable to update the bill. Check the name, amount and category, then try again.",
    async ({ household, membership }) => {
      await updateRecurringItem(household.id, form, membership.role);
    },
  );
}

export async function SetRecurringItemPaused(form: {
  id: string;
  paused: boolean;
}) {
  return withHouseholdAction(
    "Unable to update the bill. Check the bill and try again.",
    async ({ household, membership }) => {
      await setRecurringItemPaused(
        household.id,
        form.id,
        form.paused,
        membership.role,
      );
    },
  );
}

export async function DeleteRecurringItem(form: DeleteIdSchemaType) {
  return withHouseholdAction(
    "Unable to delete the bill. Check the bill and try again.",
    async ({ household, membership }) => {
      await deleteRecurringItem(household.id, form.id, membership.role);
    },
  );
}
