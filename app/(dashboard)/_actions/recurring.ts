"use server";

import type { DeleteIdSchemaType } from "@/schemas/delete";
import type {
  CreateRecurringItemType,
  UpdateRecurringItemType,
} from "@/schemas/recurring";

import { withHouseholdAction } from "@/lib/action-result";
import { CACHE_RESOURCE, revalidateHousehold } from "@/lib/cache";
import {
  createRecurringItem,
  deleteRecurringItem,
  setRecurringItemPaused,
  updateRecurringItem,
} from "@/lib/recurring";

export async function CreateRecurringItem(form: CreateRecurringItemType) {
  return withHouseholdAction(
    "Unable to add the bill. Check the name, amount and category, then try again.",
    async ({ caller }) => {
      await createRecurringItem(caller, form);
      revalidateHousehold(caller.householdId, [CACHE_RESOURCE.recurring]);
    },
  );
}

export async function UpdateRecurringItem(form: UpdateRecurringItemType) {
  return withHouseholdAction(
    "Unable to update the bill. Check the name, amount and category, then try again.",
    async ({ caller }) => {
      await updateRecurringItem(caller, form);
      revalidateHousehold(caller.householdId, [CACHE_RESOURCE.recurring]);
    },
  );
}

export async function SetRecurringItemPaused(form: {
  id: string;
  paused: boolean;
}) {
  return withHouseholdAction(
    "Unable to update the bill. Check the bill and try again.",
    async ({ caller }) => {
      await setRecurringItemPaused(caller, form.id, form.paused);
      revalidateHousehold(caller.householdId, [CACHE_RESOURCE.recurring]);
    },
  );
}

export async function DeleteRecurringItem(form: DeleteIdSchemaType) {
  return withHouseholdAction(
    "Unable to delete the bill. Check the bill and try again.",
    async ({ caller }) => {
      await deleteRecurringItem(caller, form.id);
      revalidateHousehold(caller.householdId, [CACHE_RESOURCE.recurring]);
    },
  );
}
