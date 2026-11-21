import type { TransactionType } from "@/lib/types";
import type {
  CreateCategorySchemaType,
  UpdateCategorySchemaType,
} from "@/schemas/categories";

import { cacheLife, cacheTag } from "next/cache";

import { CACHE_RESOURCE, householdTag } from "@/lib/cache";
import { actorFor, assertCallerFullMember, type Caller } from "@/lib/caller";
import { categoryIconSnapshot } from "@/lib/category-icons";
import { DomainError } from "@/lib/errors";
import prisma from "@/lib/prisma";
import { publishHouseholdChange } from "@/lib/realtime";
import {
  isSettlementCategory,
  settlementCategoryExclusion,
} from "@/lib/settlements";
import {
  CreateCategorySchema,
  UpdateCategorySchema,
} from "@/schemas/categories";
import { DeleteIdSchema } from "@/schemas/delete";

export async function getCategories(
  householdId: string,
  type?: "expense" | "income" | null,
) {
  "use cache";
  cacheLife("hours");
  cacheTag(householdTag(householdId, CACHE_RESOURCE.categories));

  return await prisma.category.findMany({
    where: {
      householdId,
      name: settlementCategoryExclusion(),
      ...(type && { type }),
    },
    select: {
      id: true,
      name: true,
      icon: true,
      iconKind: true,
      iconColor: true,
      type: true,
    },
    orderBy: {
      name: "asc",
    },
  });
}

export async function createHouseholdCategory(
  caller: Caller,
  input: CreateCategorySchemaType,
) {
  assertCallerFullMember(caller);
  const parsed = CreateCategorySchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError(
      parsed.error.issues[0]?.message ?? "Invalid category",
    );
  }

  const { name, icon, iconKind, iconColor, type } = parsed.data;

  assertNotSettlementCategory(name);

  const category = await prisma.category.create({
    data: {
      householdId: caller.householdId,
      name,
      icon,
      iconKind,
      iconColor,
      type,
    },
  });

  await publishHouseholdChange({
    householdId: caller.householdId,
    actor: actorFor(caller),
    resource: "categories",
    message: `added the ${category.name} category`,
  });

  return category;
}

export async function requireCategory(
  householdId: string,
  name: string,
  type: TransactionType,
) {
  const category = await prisma.category.findFirst({
    where: {
      householdId,
      name,
      type,
    },
  });

  if (!category) {
    throw new DomainError("Category not found");
  }

  return category;
}

function assertNotSettlementCategory(name: string) {
  if (isSettlementCategory(name)) {
    throw new DomainError("Sora manages the Settlement category.");
  }
}

export async function updateHouseholdCategory(
  caller: Caller,
  input: UpdateCategorySchemaType,
) {
  assertCallerFullMember(caller);
  const parsed = UpdateCategorySchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError(
      parsed.error.issues[0]?.message ?? "Invalid category",
    );
  }

  const { originalName, name, icon, iconKind, iconColor, type } = parsed.data;

  assertNotSettlementCategory(originalName);
  if (name !== originalName) {
    assertNotSettlementCategory(name);
  }

  const existing = await prisma.category.findUnique({
    where: {
      name_householdId_type: {
        householdId: caller.householdId,
        name: originalName,
        type,
      },
    },
  });

  if (!existing) {
    throw new DomainError("Category not found");
  }

  const iconChanged =
    icon !== existing.icon ||
    iconKind !== existing.iconKind ||
    iconColor !== existing.iconColor;

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.category.update({
      where: {
        name_householdId_type: {
          householdId: caller.householdId,
          name: originalName,
          type,
        },
      },
      data: { name, icon, iconKind, iconColor },
    });

    await tx.transaction.updateMany({
      where: {
        householdId: caller.householdId,
        category: originalName,
        type,
      },
      data: {
        ...(name !== originalName && { category: name }),
        ...(iconChanged && categoryIconSnapshot(updated)),
      },
    });

    if (type === "expense" && name !== originalName) {
      await tx.budget.updateMany({
        where: {
          householdId: caller.householdId,
          category: originalName,
        },
        data: { category: name },
      });
    }

    if (name !== originalName || iconChanged) {
      await tx.recurringItem.updateMany({
        where: {
          householdId: caller.householdId,
          category: originalName,
          type,
        },
        data: {
          ...(name !== originalName && { category: name }),
          ...(iconChanged && categoryIconSnapshot(updated)),
        },
      });
    }

    await publishHouseholdChange({
      householdId: caller.householdId,
      actor: actorFor(caller),
      resource: "categories",
      message: `changed the ${updated.name} category`,
      executor: tx,
    });

    return updated;
  });
}

export async function deleteHouseholdCategory(caller: Caller, id: string) {
  assertCallerFullMember(caller);

  const parsedId = DeleteIdSchema.safeParse({ id });
  if (!parsedId.success) {
    throw new DomainError(
      parsedId.error.issues[0]?.message ?? "Category not found",
    );
  }

  const category = await prisma.category.findFirst({
    where: {
      id,
      householdId: caller.householdId,
    },
  });
  if (!category) {
    throw new DomainError("Category not found");
  }

  assertNotSettlementCategory(category.name);

  const deleted = await prisma.category.deleteMany({
    where: {
      id,
      householdId: caller.householdId,
    },
  });
  if (deleted.count === 0) {
    throw new DomainError("Category not found");
  }

  await publishHouseholdChange({
    householdId: caller.householdId,
    actor: actorFor(caller),
    resource: "categories",
    message: `removed the ${category.name} category`,
  });

  return category;
}
