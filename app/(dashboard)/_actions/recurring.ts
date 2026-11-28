"use server";

import type { DeleteIdSchemaType } from "@/schemas/delete";
import type {
  CreateRecurringItemType,
  UpdateRecurringItemType,
} from "@/schemas/recurring";

import { withWalletAction } from "@/lib/action-result";
import {
  createRecurringItem,
  deleteRecurringItem,
  setRecurringItemPaused,
  updateRecurringItem,
} from "@/lib/recurring";

export async function CreateRecurringItem(form: CreateRecurringItemType) {
  return withWalletAction(
    "Unable to add the bill. Check the name, amount and category, then try again.",
    async ({ caller }) => {
      await createRecurringItem(caller, form);
    },
  );
}

export async function UpdateRecurringItem(form: UpdateRecurringItemType) {
  return withWalletAction(
    "Unable to update the bill. Check the name, amount and category, then try again.",
    async ({ caller }) => {
      await updateRecurringItem(caller, form);
    },
  );
}

export async function SetRecurringItemPaused(form: {
  id: string;
  paused: boolean;
}) {
  return withWalletAction(
    "Unable to update the bill. Check the bill and try again.",
    async ({ caller }) => {
      await setRecurringItemPaused(caller, form.id, form.paused);
    },
  );
}

export async function DeleteRecurringItem(form: DeleteIdSchemaType) {
  return withWalletAction(
    "Unable to delete the bill. Check the bill and try again.",
    async ({ caller }) => {
      await deleteRecurringItem(caller, form.id);
    },
  );
}
