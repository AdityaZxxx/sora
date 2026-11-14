"use server";

import type {
  CreateCategorySchemaType,
  UpdateCategorySchemaType,
} from "@/schemas/categories";
import type { DeleteIdSchemaType } from "@/schemas/delete";

import { redirect } from "next/navigation";

import {
  createHouseholdCategory,
  deleteHouseholdCategory,
  updateHouseholdCategory,
} from "@/lib/categories";
import { requireHousehold } from "@/lib/household";
import {
  CreateCategorySchema,
  UpdateCategorySchema,
} from "@/schemas/categories";
import { DeleteIdSchema } from "@/schemas/delete";

export async function CreateCategory(form: CreateCategorySchemaType) {
  const parsedBody = CreateCategorySchema.safeParse(form);
  if (!parsedBody.success) {
    throw new Error("Bad request");
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  return await createHouseholdCategory(
    result.household.id,
    parsedBody.data,
    result.membership.role,
  );
}

export async function UpdateCategory(form: UpdateCategorySchemaType) {
  const parsedBody = UpdateCategorySchema.safeParse(form);
  if (!parsedBody.success) {
    throw new Error("Bad request");
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  return await updateHouseholdCategory(
    result.household.id,
    parsedBody.data,
    result.membership.role,
  );
}

export async function DeleteCategory(form: DeleteIdSchemaType) {
  const parsedBody = DeleteIdSchema.safeParse(form);
  if (!parsedBody.success) {
    throw new Error(parsedBody.error.issues[0]?.message ?? "Bad request");
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  return await deleteHouseholdCategory(
    result.household.id,
    parsedBody.data.id,
    result.membership.role,
  );
}
