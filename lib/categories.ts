import type { TransactionType } from "@/lib/types";
import type {
  CreateCategorySchemaType,
  UpdateCategorySchemaType,
} from "@/schemas/categories";

import { cacheLife, cacheTag } from "next/cache";

import { CACHE_RESOURCE, walletTag } from "@/lib/cache";
import {
  actorFor,
  assertCallerCanEditCategory,
  assertCallerCanWrite,
  type Caller,
} from "@/lib/caller";
import { categoryIconSnapshot } from "@/lib/category-icons";
import { DomainError } from "@/lib/errors";
import prisma from "@/lib/prisma";
import { publishWalletChange } from "@/lib/realtime";
import {
  CreateCategorySchema,
  UpdateCategorySchema,
} from "@/schemas/categories";
import { DeleteIdSchema } from "@/schemas/delete";

export async function getCategories(
  walletId: string,
  type?: "expense" | "income" | null,
) {
  "use cache";
  cacheLife("hours");
  cacheTag(walletTag(walletId, CACHE_RESOURCE.categories));

  return await prisma.category.findMany({
    where: {
      walletId,
      ...(type && { type }),
    },
    select: {
      id: true,
      name: true,
      icon: true,
      iconKind: true,
      iconColor: true,
      type: true,
      createdById: true,
      createdByName: true,
    },
    orderBy: {
      name: "asc",
    },
  });
}

export async function createWalletCategory(
  caller: Caller,
  input: CreateCategorySchemaType,
) {
  assertCallerCanWrite(caller);
  const parsed = CreateCategorySchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError(
      parsed.error.issues[0]?.message ?? "Invalid category",
    );
  }

  const { name, icon, iconKind, iconColor, type } = parsed.data;

  const category = await prisma.category.create({
    data: {
      walletId: caller.walletId,
      name,
      icon,
      iconKind,
      iconColor,
      type,
      createdById: caller.userId,
      createdByName: caller.actorName,
    },
  });

  await publishWalletChange({
    walletId: caller.walletId,
    actor: actorFor(caller),
    resource: "categories",
    message: `added the ${category.name} category`,
  });

  return category;
}

export async function requireCategory(
  walletId: string,
  name: string,
  type: TransactionType,
) {
  const category = await prisma.category.findFirst({
    where: {
      walletId,
      name,
      type,
    },
  });

  if (!category) {
    throw new DomainError("Category not found");
  }

  return category;
}

export async function updateWalletCategory(
  caller: Caller,
  input: UpdateCategorySchemaType,
) {
  const parsed = UpdateCategorySchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError(
      parsed.error.issues[0]?.message ?? "Invalid category",
    );
  }

  const { originalName, name, icon, iconKind, iconColor, type } = parsed.data;

  const existing = await prisma.category.findUnique({
    where: {
      name_walletId_type: {
        walletId: caller.walletId,
        name: originalName,
        type,
      },
    },
  });

  if (!existing) {
    throw new DomainError("Category not found");
  }
  assertCallerCanEditCategory(caller, existing.createdById);

  const renamed = name !== originalName;
  const iconChanged =
    icon !== existing.icon ||
    iconKind !== existing.iconKind ||
    iconColor !== existing.iconColor;

  const scope = renamed ? "category-renamed" : "category-icon-changed";
  const category = await prisma.$transaction(async (tx) => {
    const updatedCategory = await tx.category.update({
      where: {
        name_walletId_type: {
          walletId: caller.walletId,
          name: originalName,
          type,
        },
      },
      data: { name, icon, iconKind, iconColor },
    });

    await tx.transaction.updateMany({
      where: {
        walletId: caller.walletId,
        category: originalName,
        type,
      },
      data: {
        ...(renamed && { category: name }),
        ...(iconChanged && categoryIconSnapshot(updatedCategory)),
      },
    });

    if (type === "expense" && renamed) {
      await tx.budget.updateMany({
        where: {
          walletId: caller.walletId,
          category: originalName,
        },
        data: { category: name },
      });
    }

    if (renamed || iconChanged) {
      await tx.recurringItem.updateMany({
        where: {
          walletId: caller.walletId,
          category: originalName,
          type,
        },
        data: {
          ...(renamed && { category: name }),
          ...(iconChanged && categoryIconSnapshot(updatedCategory)),
        },
      });
    }

    return updatedCategory;
  });

  await publishWalletChange({
    walletId: caller.walletId,
    actor: actorFor(caller),
    resource: "categories",
    message: `changed the ${category.name} category`,
    scope,
  });

  return category;
}

export async function deleteWalletCategory(caller: Caller, id: string) {
  const parsedId = DeleteIdSchema.safeParse({ id });
  if (!parsedId.success) {
    throw new DomainError(
      parsedId.error.issues[0]?.message ?? "Category not found",
    );
  }

  const category = await prisma.category.findFirst({
    where: {
      id,
      walletId: caller.walletId,
    },
  });
  if (!category) {
    throw new DomainError("Category not found");
  }
  assertCallerCanEditCategory(caller, category.createdById);

  const deleted = await prisma.category.deleteMany({
    where: {
      id,
      walletId: caller.walletId,
    },
  });
  if (deleted.count === 0) {
    throw new DomainError("Category not found");
  }

  await publishWalletChange({
    walletId: caller.walletId,
    actor: actorFor(caller),
    resource: "categories",
    message: `removed the ${category.name} category`,
  });

  return category;
}
