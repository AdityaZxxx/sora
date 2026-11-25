import type { TransactionType } from "@/lib/types";
import type { z } from "zod";

import { Prisma } from "@prisma/client";
import { cacheLife, cacheTag } from "next/cache";
import { after } from "next/server";
import { randomUUID } from "node:crypto";

import { assertBudgetAllows } from "@/lib/budgets";
import { CACHE_RESOURCE, householdTag } from "@/lib/cache";
import {
  actorFor,
  assertCallerFullMember,
  type Actor,
  type Caller,
} from "@/lib/caller";
import { requireCategory } from "@/lib/categories";
import { categoryIconSnapshot } from "@/lib/category-icons";
import {
  DEFAULT_CURRENCY,
  TRANSACTION_HISTORY_PAGE_SIZE,
} from "@/lib/constants";
import { DomainError } from "@/lib/errors";
import { getFormatterForCurrency } from "@/lib/helpers";
import { toMoney } from "@/lib/money";
import prisma from "@/lib/prisma";
import {
  notifyHouseholdChange,
  publishHouseholdChange,
  type DeferredRevalidation,
} from "@/lib/realtime";
import { decrementRollups, incrementRollups } from "@/lib/rollups";
import { settlementCategoryExclusion } from "@/lib/settlements";
import { sharesMatchExpense, sharesTotal } from "@/lib/split-shares";
import {
  buildPostCommitEffects,
  type PostCommitEffect,
} from "@/lib/transaction-post-commit";
import { DeleteIdSchema } from "@/schemas/delete";
import { CreateTransactionSchema } from "@/schemas/transaction";

type TransactionCursor = { date: string; id: string };

const IDEMPOTENCY_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function notifyPersonalTransactionChange(
  householdId: string,
  actor: Actor,
  recipientId: string,
  message: string,
  executor: Prisma.TransactionClient,
) {
  return notifyHouseholdChange({
    householdId,
    actor,
    resource: "transactions",
    message,
    recipientId,
    scope: "personal-transaction",
    executor,
  });
}

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

  const income =
    totals.find((t) => t.type === "income")?._sum.amount ??
    new Prisma.Decimal(0);
  const expense =
    totals.find((t) => t.type === "expense")?._sum.amount ??
    new Prisma.Decimal(0);

  return {
    expense: expense.toNumber(),
    income: income.toNumber(),
    net: income.minus(expense).toNumber(),
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

export type CreateTransactionInput = z.output<
  typeof CreateTransactionSchema
> & {
  addedVia?: "agent" | null;
  idempotencyKey?: string;
};

type Clock = () => Date;
type EffectPublisher = (effect: PostCommitEffect) => void;

const systemClock: Clock = () => new Date();
const afterPublisher: EffectPublisher = (effect) => {
  after(effect);
};

type CreateTransactionDeps = {
  clock: Clock;
  publisher: EffectPublisher;
};

type StoredTransaction = NonNullable<
  Awaited<ReturnType<typeof prisma.transaction.findFirst>>
>;

type NewTransaction = {
  householdId: string;
  addedById: string;
  amount: number;
  date: Date;
  description: string;
  type: TransactionType;
  shared: boolean;
  category: string;
  goalId: string | null;
  addedVia: "agent" | null;
};

function readIdempotencyKey(raw: string | undefined) {
  return raw && IDEMPOTENCY_KEY_PATTERN.test(raw) ? raw : undefined;
}

function isSameTransaction(existing: StoredTransaction, next: NewTransaction) {
  return (
    existing.amount.eq(toMoney(next.amount)) &&
    existing.date.getTime() === next.date.getTime() &&
    existing.type === next.type &&
    existing.shared === next.shared &&
    existing.category === next.category &&
    existing.addedById === next.addedById &&
    existing.description === next.description &&
    existing.goalId === next.goalId &&
    existing.addedVia === next.addedVia
  );
}

async function resolveIdempotentWrite(
  tx: Prisma.TransactionClient,
  householdId: string,
  key: string | undefined,
  next: NewTransaction,
): Promise<{ existing: StoredTransaction } | { id: string | undefined }> {
  if (!key) return { id: undefined };
  const existing = await tx.transaction.findFirst({
    where: { id: key, householdId },
  });
  if (!existing) return { id: key };
  if (isSameTransaction(existing, next)) return { existing };
  return { id: randomUUID() };
}

export async function createTransaction(
  caller: Caller,
  input: CreateTransactionInput,
) {
  return createTransactionWithDeps(caller, input, {
    clock: systemClock,
    publisher: afterPublisher,
  });
}

async function createTransactionWithDeps(
  caller: Caller,
  input: CreateTransactionInput,
  deps: CreateTransactionDeps,
) {
  assertCallerFullMember(caller);
  const { householdId, userId } = caller;
  const actor = actorFor(caller);

  const key = readIdempotencyKey(input.idempotencyKey);

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
  const moneyAmount = toMoney(amount);
  const goalId = parsedBody.data.goalId || undefined;
  const addedVia = input.addedVia ?? null;
  const recurringItemId = input.recurringItemId || undefined;
  const shareInput = parsedBody.data.shares ?? [];

  const [household, goal, memberships, recurringItem] = await Promise.all([
    prisma.household.findUnique({
      where: {
        id: householdId,
      },
      select: {
        currency: true,
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
      `The member shares add up to ${formatAmount(sharesTotal(shareInput).toNumber())} but the expense is ${formatAmount(amount)}.`,
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

  const next: NewTransaction = {
    householdId,
    addedById: userId,
    amount,
    date,
    description: description || "",
    type,
    shared,
    category: categoryRow.name,
    goalId: goalId ?? null,
    addedVia,
  };

  let personalRevalidation: DeferredRevalidation | undefined;

  const attemptWrite = async (writeKey: string | undefined) =>
    prisma.$transaction(async (tx) => {
      const resolved = await resolveIdempotentWrite(
        tx,
        householdId,
        writeKey,
        next,
      );
      if ("existing" in resolved) return resolved.existing;

      const transaction = await tx.transaction.create({
        data: {
          id: resolved.id,
          ...next,
          ...categoryIconSnapshot(categoryRow),
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
            lastPostedAt: deps.clock(),
          },
        });
      }

      if (!shared) {
        personalRevalidation = await notifyPersonalTransactionChange(
          householdId,
          actor,
          userId,
          "added a personal transaction",
          tx,
        );
        return transaction;
      }

      await incrementRollups(tx, {
        householdId,
        date,
        type,
        amount: moneyAmount,
      });
      await publishHouseholdChange({
        householdId,
        actor,
        resource: "transactions",
        message: `added ${description || categoryRow.name}, ${formatAmount(amount)}`,
        executor: tx,
      });

      return transaction;
    });

  let created: StoredTransaction;
  try {
    created = await attemptWrite(key);
  } catch (cause) {
    if (
      key &&
      cause instanceof Prisma.PrismaClientKnownRequestError &&
      cause.code === "P2002"
    ) {
      const existing = await prisma.transaction.findFirst({
        where: { id: key, householdId },
      });
      created =
        existing && isSameTransaction(existing, next)
          ? existing
          : await attemptWrite(undefined);
    } else {
      throw cause;
    }
  }

  personalRevalidation?.();

  const effects = buildPostCommitEffects({
    actor,
    householdId,
    userId,
    actorName: caller.actorName,
    categoryName: categoryRow.name,
    amount,
    description: description ?? "",
    type,
    shared,
    formattedAmount: formatAmount(amount),
    formatAmount,
    thresholdMessage,
    goal: goal ? { id: goal.id, name: goal.name, target: goal.target } : null,
  });
  for (const effect of effects) {
    deps.publisher(effect);
  }

  return created;
}

export async function deleteTransaction(caller: Caller, id: string) {
  assertCallerFullMember(caller);
  const { householdId } = caller;

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

  let personalRevalidation: DeferredRevalidation | undefined;

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
      personalRevalidation = await notifyPersonalTransactionChange(
        householdId,
        actorFor(caller),
        transaction.addedById,
        "removed a personal transaction",
        tx,
      );
      return;
    }

    await decrementRollups(tx, {
      householdId,
      date: transaction.date,
      type: transaction.type,
      amount: transaction.amount,
    });
    await publishHouseholdChange({
      householdId,
      actor: actorFor(caller),
      resource: "transactions",
      message: `removed ${transaction.description || transaction.category}`,
      executor: tx,
    });
  });

  personalRevalidation?.();
}
