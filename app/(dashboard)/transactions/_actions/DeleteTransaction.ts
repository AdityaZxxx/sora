"use server";

import type { DeleteIdSchemaType } from "@/schemas/delete";

import { redirect } from "next/navigation";

import { requireHousehold } from "@/lib/household";
import { deleteTransaction } from "@/lib/transactions";
import { DeleteIdSchema } from "@/schemas/delete";

export async function DeleteTransaction(form: DeleteIdSchemaType) {
  const parsedBody = DeleteIdSchema.safeParse(form);
  if (!parsedBody.success) {
    throw new Error(parsedBody.error.issues[0]?.message ?? "Bad request");
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  await deleteTransaction(
    result.household.id,
    parsedBody.data.id,
    result.membership.role,
  );
}
