"use server";

import type { DeleteIdSchemaType } from "@/schemas/delete";

import { redirect } from "next/navigation";

import { ok, fail } from "@/lib/action-result";
import { DomainError } from "@/lib/errors";
import { requireHousehold } from "@/lib/household";
import { firstIssueMessage } from "@/lib/issue-message";
import { deleteTransaction } from "@/lib/transactions";

export async function DeleteTransaction(form: DeleteIdSchemaType) {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  try {
    await deleteTransaction(
      result.household.id,
      form.id,
      result.membership.role,
    );
  } catch (cause) {
    if (cause instanceof DomainError) {
      return fail(
        firstIssueMessage(
          cause.message,
          "Unable to delete the transaction. Refresh the page and try again.",
        ),
      );
    }
    throw cause;
  }

  return ok();
}
