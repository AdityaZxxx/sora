import type { TransactionType } from "@/lib/types";

import { Prisma } from "@prisma/client";
import { after } from "next/server";

import { assertBudgetAllows } from "@/lib/budgets";
import { requireCategory } from "@/lib/categories";
import { categoryIconSnapshot } from "@/lib/category-icons";
import { DEFAULT_CURRENCY } from "@/lib/constants";
import { DomainError } from "@/lib/errors";
import { getFormatterForCurrency } from "@/lib/helpers";
import { notifyHouseholdExcept, notifyMembers } from "@/lib/notifications";
import prisma from "@/lib/prisma";
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

export async function getTransactionsHistory(
  householdId: string,
  userId: string,
  from: Date,
  to: Date,
  filters?: {
    category?: string;
    shared?: boolean;
  },
) {
  const transactions = await prisma.transaction.findMany({
    where: {
      householdId,
      date: {
        gte: from,
        lte: to,
      },
      OR: [{ shared: true }, { addedById: userId }],
      ...(filters?.category && { category: filters.category }),
      ...(filters?.shared !== undefined && { shared: filters.shared }),
    },
    orderBy: {
      date: "asc",
    },
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

  return transactions.map(({ addedBy, amount, ...transaction }) => ({
    ...transaction,
    amount: amount.toNumber(),
    addedByName: addedBy.name,
  }));
}

export type GetTransactionsHistoryResponseType = Awaited<
  ReturnType<typeof getTransactionsHistory>
>;

export async function getBalanceStats(
  householdId: string,
  from: Date,
  to: Date,
) {
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
};

export async function createTransaction(
  householdId: string,
  userId: string,
  input: CreateTransactionInput,
  role: MemberRole,
) {
  assertFullMemberRole(role);
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

  const { amount, date, description, type, shared } = parsedBody.data;
  const goalId = parsedBody.data.goalId || undefined;
  const addedVia = input.addedVia ?? null;
  const recurringItemId = input.recurringItemId || undefined;
  const shareInput = parsedBody.data.shares ?? [];
  if (shareInput.length > 0 && (type !== "expense" || !shared)) {
    throw new DomainError("Shares are only valid for shared expenses");
  }

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
      shareInput.length > 0
        ? prisma.householdMembership.findMany({
            where: {
              householdId,
            },
            select: {
              userId: true,
            },
          })
        : [],
      recurringItemId
        ? prisma.recurringItem.findFirst({
            where: {
              id: recurringItemId,
              householdId,
            },
          })
        : null,
    ]);

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

  const created = await prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.create({
      data: {
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

    return transaction;
  });

  if (thresholdMessage) {
    const message = thresholdMessage;
    after(() =>
      notifyHouseholdExcept(householdId, userId, "budget_threshold", message),
    );
  }

  if (shared) {
    const message = `${actor?.name ?? "A member"} added a shared ${type} of ${formatAmount(amount)} (${description || categoryRow.name}).`;
    after(() =>
      notifyHouseholdExcept(householdId, userId, "transaction", message),
    );
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
    });
  }

  after(() =>
    evaluateUnusualSpending({
      amount,
      category: categoryRow.name,
      description: description ?? "",
      type,
      shared,
      householdId,
      userId,
    }),
  );

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
  });
}
