import type { TransactionType } from "@/lib/types";

import { Prisma } from "@prisma/client";
import { cacheLife, cacheTag } from "next/cache";
import { after } from "next/server";

import { assertBudgetAllows } from "@/lib/budgets";
import { CACHE_RESOURCE, householdTag, revalidateHousehold } from "@/lib/cache";
import { requireCategory } from "@/lib/categories";
import { categoryIconSnapshot } from "@/lib/category-icons";
import {
  DEFAULT_CURRENCY,
  TRANSACTION_HISTORY_PAGE_SIZE,
} from "@/lib/constants";
import { DomainError } from "@/lib/errors";
import { getFormatterForCurrency } from "@/lib/helpers";
import { notifyHouseholdExcept, notifyMembers } from "@/lib/notifications";
import prisma from "@/lib/prisma";
import { publishHouseholdChange } from "@/lib/realtime";
import { assertFullMemberRole, type MemberRole } from "@/lib/roles";
import { decrementRollups, incrementRollups } from "@/lib/rollups";
import { settlementCategoryExclusion } from "@/lib/settlements";
import {
  fromCents,
  sharesMatchExpense,
  sharesTotalCents,
} from "@/lib/split-shares";
import { evaluateUnusualSpending } from "@/lib/unusual-spending";
import { DeleteIdSchema } from "@/schemas/delete";
import { CreateTransactionSchema } from "@/schemas/transaction";

type TransactionCursor = { date: string; id: string };

const IDEMPOTENCY_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function encodeCursor(date: Date, id: string) {
  return Buffer.from(
    JSON.stringify({
      date: date.toISOString(),
      id,
    } satisfies TransactionCursor),
  ).toString("base64url");
}

function decodeCursor(
  cursor: string | null | undefined,
): TransactionCursor | null {
  if (!cursor) return null;
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    );
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "date" in parsed &&
      "id" in parsed &&
      typeof parsed.date === "string" &&
      typeof parsed.id === "string"
    ) {
      return { date: parsed.date, id: parsed.id };
    }
    return null;
  } catch {
    return null;
  }
}

export async function getTransactionsHistory(
  householdId: string,
  userId: string,
  from: Date,
  to: Date,
  options: {
    category?: string;
    shared?: boolean;
    cursor?: string | null;
    limit?: number;
  } = {},
) {
  "use cache";
  cacheLife("minutes");
  cacheTag(householdTag(householdId, CACHE_RESOURCE.transactions));

  const cursor = decodeCursor(options.cursor);
  const limit = options.limit ?? TRANSACTION_HISTORY_PAGE_SIZE;
  const cursorFilter = cursor
    ? {
        OR: [
          { date: { gt: new Date(cursor.date) } },
          { date: new Date(cursor.date), id: { gt: cursor.id } },
        ],
      }
    : null;

  const transactions = await prisma.transaction.findMany({
    where: {
      householdId,
      date: {
        gte: from,
        lte: to,
      },
      OR: [{ shared: true }, { addedById: userId }],
      ...(options.category && { category: options.category }),
      ...(options.shared !== undefined && { shared: options.shared }),
      ...(cursorFilter && { AND: [cursorFilter] }),
    },
    orderBy: [
      {
        date: "asc",
      },
      {
        id: "asc",
      },
    ],
    take: limit + 1,
    select: {
      id: true,
      date: true,
      description: true,
      amount: true,
      type: true,
      category: true,
      categoryIcon: true,
      categoryIconKind: true,
      categoryIconColor: true,
      shared: true,
      addedById: true,
      addedVia: true,
      addedBy: {
        select: {
          name: true,
        },
      },
    },
  });

  const hasMore = transactions.length > limit;
  const page = hasMore ? transactions.slice(0, limit) : transactions;
  const last = page.at(-1);

  return {
    transactions: page.map(({ addedBy, amount, ...transaction }) => ({
      ...transaction,
      amount: amount.toNumber(),
      addedByName: addedBy.name,
    })),
    nextCursor: hasMore && last ? encodeCursor(last.date, last.id) : null,
  };
}

export type GetTransactionsHistoryResponseType = Awaited<
  ReturnType<typeof getTransactionsHistory>
>;

export type TransactionHistoryRow =
  GetTransactionsHistoryResponseType["transactions"][number];

export async function getBalanceStats(
  householdId: string,
  from: Date,
  to: Date,
) {
  "use cache";
  cacheLife("minutes");
  cacheTag(householdTag(householdId, CACHE_RESOURCE.transactions));

  const totals = await prisma.transaction.groupBy({
    by: ["type"],
    where: {
      householdId,
      shared: true,
      date: {
        gte: from,
        lte: to,
      },
    },
    _sum: {
      amount: true,
    },
  });

  return {
    expense:
      totals.find((t) => t.type === "expense")?._sum.amount?.toNumber() ?? 0,

    income:
      totals.find((t) => t.type === "income")?._sum.amount?.toNumber() ?? 0,
  };
}

export type GetBalanceStatsResponseType = Awaited<
  ReturnType<typeof getBalanceStats>
>;

export async function getCategoriesStats(
  householdId: string,
  from: Date,
  to: Date,
) {
  "use cache";
  cacheLife("minutes");
  cacheTag(householdTag(householdId, CACHE_RESOURCE.transactions));

  const stats = await prisma.transaction.groupBy({
    by: [
      "type",
      "category",
      "categoryIcon",
      "categoryIconKind",
      "categoryIconColor",
    ],
    where: {
      householdId,
      shared: true,
      category: settlementCategoryExclusion(),
      date: {
        gte: from,
        lte: to,
      },
    },
    _sum: {
      amount: true,
    },
    orderBy: {
      _sum: {
        amount: "desc",
      },
    },
  });

  return stats.map((row) => ({
    ...row,
    _sum: {
      ...row._sum,
      amount: row._sum.amount?.toNumber() ?? 0,
    },
  }));
}

export type GetCategoriesStatsResponseType = Awaited<
  ReturnType<typeof getCategoriesStats>
>;

export type CreateTransactionInput = {
  amount: number;
  category: string;
  description?: string;
  type: TransactionType;
  date: Date;
  shared?: boolean;
  goalId?: string;
  shares?: { userId: string; amount: number }[];
  addedVia?: "agent" | null;
  recurringItemId?: string;
  idempotencyKey?: string;
};

export async function createTransaction(
  householdId: string,
  userId: string,
  input: CreateTransactionInput,
  role: MemberRole,
) {
  assertFullMemberRole(role);

  const idempotencyKey =
    input.idempotencyKey && IDEMPOTENCY_KEY_PATTERN.test(input.idempotencyKey)
      ? input.idempotencyKey
      : undefined;

  const categoryRow = await requireCategory(
    householdId,
    input.category,
    input.type,
  );

  const parsedBody = CreateTransactionSchema.safeParse({
    ...input,
    category: categoryRow.name,
  });
  if (!parsedBody.success) {
    throw new DomainError(
      parsedBody.error.issues[0]?.message ?? "Invalid transaction input",
    );
  }

  const { amount, date, description, type } = parsedBody.data;
  const goalId = parsedBody.data.goalId || undefined;
  const addedVia = input.addedVia ?? null;
  const recurringItemId = input.recurringItemId || undefined;
  const shareInput = parsedBody.data.shares ?? [];

  const [household, actor, goal, memberships, recurringItem] =
    await Promise.all([
      prisma.household.findUnique({
        where: {
          id: householdId,
        },
        select: {
          currency: true,
        },
      }),
      prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          name: true,
        },
      }),
      goalId
        ? prisma.goal.findFirst({
            where: {
              id: goalId,
              householdId,
            },
          })
        : null,
      prisma.householdMembership.findMany({
        where: {
          householdId,
        },
        select: {
          userId: true,
        },
      }),
      recurringItemId
        ? prisma.recurringItem.findFirst({
            where: {
              id: recurringItemId,
              householdId,
            },
          })
        : null,
    ]);

  const shared = memberships.length === 1 ? true : parsedBody.data.shared;

  if (shareInput.length > 0 && (type !== "expense" || !shared)) {
    throw new DomainError("Shares are only valid for shared expenses");
  }

  type StoredTransaction = NonNullable<
    Awaited<ReturnType<typeof prisma.transaction.findFirst>>
  >;
  const matchesKeyedTransaction = (existing: StoredTransaction) =>
    existing.amount.toNumber() === amount &&
    existing.date.getTime() === date.getTime() &&
    existing.type === type &&
    existing.shared === shared &&
    existing.category === categoryRow.name &&
    existing.addedById === userId &&
    existing.description === (description || "") &&
    existing.goalId === (goalId ?? null) &&
    existing.addedVia === addedVia;

  if (goalId && !goal) {
    throw new DomainError("Goal not found");
  }
  if (recurringItemId && !recurringItem) {
    throw new DomainError("Recurring item not found");
  }

  const formatAmount = getFormatterForCurrency(
    household?.currency ?? DEFAULT_CURRENCY,
  ).format;

  const memberIds = new Set(memberships.map((m) => m.userId));
  const shareUserIds = shareInput.map((share) => share.userId);
  const hasForeignOrDuplicateMember =
    shareUserIds.some((shareUserId) => !memberIds.has(shareUserId)) ||
    new Set(shareUserIds).size !== shareUserIds.length;
  if (hasForeignOrDuplicateMember) {
    throw new DomainError(
      "Shares must name each member of this household at most once",
    );
  }

  if (!sharesMatchExpense(shareInput, amount)) {
    throw new DomainError(
      `The member shares add up to ${formatAmount(fromCents(sharesTotalCents(shareInput)))} but the expense is ${formatAmount(amount)}.`,
    );
  }

  const thresholdMessage = await assertBudgetAllows({
    householdId,
    currency: household?.currency ?? DEFAULT_CURRENCY,
    category: categoryRow.name,
    type,
    shared,
    amount,
    date,
  });

  let created;
  try {
    created = await prisma.$transaction(async (tx) => {
      if (idempotencyKey) {
        const existing = await tx.transaction.findFirst({
          where: { id: idempotencyKey, householdId },
        });
        if (existing) {
          if (!matchesKeyedTransaction(existing)) {
            throw new DomainError(
              "This idempotency key belongs to a different transaction",
            );
          }
          return existing;
        }
      }

      const transaction = await tx.transaction.create({
        data: {
          id: idempotencyKey,
          householdId,
          addedById: userId,
          amount,
          date,
          description: description || "",
          type,
          shared,
          category: categoryRow.name,
          ...categoryIconSnapshot(categoryRow),
          goalId,
          addedVia,
        },
      });

      if (shareInput.length > 0) {
        await tx.transactionShare.createMany({
          data: shareInput.map((share) => ({
            transactionId: transaction.id,
            userId: share.userId,
            amount: share.amount,
          })),
        });
      }

      if (recurringItem) {
        await tx.recurringItem.update({
          where: {
            id: recurringItem.id,
          },
          data: {
            lastPostedAt: new Date(),
          },
        });
      }

      if (!shared) {
        return transaction;
      }

      await incrementRollups(tx, { householdId, date, type, amount });
      await publishHouseholdChange({
        householdId,
        resource: "transactions",
        message: `added ${description || categoryRow.name}, ${formatAmount(amount)}`,
        executor: tx,
      });

      return transaction;
    });
  } catch (cause) {
    if (
      idempotencyKey &&
      cause instanceof Prisma.PrismaClientKnownRequestError &&
      cause.code === "P2002"
    ) {
      const existing = await prisma.transaction.findFirst({
        where: { id: idempotencyKey, householdId },
      });
      if (existing && matchesKeyedTransaction(existing)) {
        return existing;
      }
    }
    throw cause;
  }

  if (thresholdMessage) {
    const message = thresholdMessage;
    after(async () => {
      await notifyHouseholdExcept(
        householdId,
        userId,
        "budget_threshold",
        message,
      );
      revalidateHousehold(householdId, [CACHE_RESOURCE.notifications]);
    });
  }

  if (shared) {
    const message = `${actor?.name ?? "A member"} added a shared ${type} of ${formatAmount(amount)} (${description || categoryRow.name}).`;
    after(async () => {
      await notifyHouseholdExcept(householdId, userId, "transaction", message);
      revalidateHousehold(householdId, [CACHE_RESOURCE.notifications]);
    });
  }

  if (goal && shared) {
    after(async () => {
      const contributed = await prisma.transaction.aggregate({
        where: {
          householdId,
          goalId: goal.id,
          shared: true,
        },
        _sum: {
          amount: true,
        },
      });
      const contributedTotal = contributed._sum.amount ?? new Prisma.Decimal(0);
      const contributedBefore = contributedTotal.minus(amount);
      if (
        contributedBefore.gte(goal.target) ||
        contributedTotal.lt(goal.target)
      ) {
        return;
      }

      const members = await prisma.householdMembership.findMany({
        where: {
          householdId,
        },
        select: {
          userId: true,
        },
      });
      await notifyMembers(
        householdId,
        members.map((member) => member.userId),
        "goal_reached",
        `${goal.name} reached its target: ${formatAmount(contributedTotal.toNumber())} of ${formatAmount(goal.target.toNumber())}.`,
      );
      revalidateHousehold(householdId, [CACHE_RESOURCE.notifications]);
    });
  }

  after(async () => {
    const result = await evaluateUnusualSpending({
      amount,
      category: categoryRow.name,
      description: description ?? "",
      type,
      shared,
      householdId,
      userId,
    });
    if (result.notified > 0) {
      revalidateHousehold(householdId, [CACHE_RESOURCE.notifications]);
    }
  });

  return created;
}

export async function deleteTransaction(
  householdId: string,
  id: string,
  role: MemberRole,
) {
  assertFullMemberRole(role);

  const parsedId = DeleteIdSchema.safeParse({ id });
  if (!parsedId.success) {
    throw new DomainError(
      parsedId.error.issues[0]?.message ?? "Transaction not found",
    );
  }

  const transaction = await prisma.transaction.findUnique({
    where: {
      householdId,
      id,
    },
  });

  if (!transaction) {
    throw new DomainError("Transaction not found");
  }

  await prisma.$transaction(async (tx) => {
    const deleted = await tx.transaction.deleteMany({
      where: {
        id,
        householdId,
      },
    });
    if (deleted.count === 0) {
      throw new DomainError("Transaction not found");
    }

    if (!transaction.shared) {
      return;
    }

    await decrementRollups(tx, {
      householdId,
      date: transaction.date,
      type: transaction.type,
      amount: transaction.amount.toNumber(),
    });
    await publishHouseholdChange({
      householdId,
      resource: "transactions",
      message: `removed ${transaction.description || transaction.category}`,
      executor: tx,
    });
  });
}
