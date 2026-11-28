import type { TransactionType } from "@/lib/types";
import type { z } from "zod";

import { Prisma, type PrismaClient } from "@prisma/client";
import { cacheLife, cacheTag } from "next/cache";
import { after } from "next/server";
import { randomUUID } from "node:crypto";

import { assertBudgetAllows } from "@/lib/budgets";
import { CACHE_RESOURCE, walletTag } from "@/lib/cache";
import {
  actorFor,
  assertCallerCanEditEntry,
  assertCallerCanWrite,
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
import { moneyText, toMoney } from "@/lib/money";
import prisma from "@/lib/prisma";
import { publishWalletChange } from "@/lib/realtime";
import { decrementRollups, incrementRollups } from "@/lib/rollups";
import { sharesMatchExpense, sharesTotal } from "@/lib/split-shares";
import {
  buildPostCommitEffects,
  type PostCommitEffect,
} from "@/lib/transaction-post-commit";
import { DeleteIdSchema } from "@/schemas/delete";
import { TransactionDraftSchema } from "@/schemas/transaction";

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
  walletId: string,
  from: Date,
  to: Date,
  options: {
    category?: string;
    cursor?: string | null;
    limit?: number;
  } = {},
) {
  "use cache";
  cacheLife("minutes");
  cacheTag(walletTag(walletId, CACHE_RESOURCE.transactions));

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
      walletId,
      date: {
        gte: from,
        lte: to,
      },
      ...(options.category && { category: options.category }),
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
      goalId: true,
      addedById: true,
      addedVia: true,
      _count: {
        select: {
          shares: true,
        },
      },
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
    transactions: page.map(({ addedBy, amount, _count, ...transaction }) => ({
      ...transaction,
      amount: moneyText(amount),
      addedByName: addedBy.name,
      hasShares: _count.shares > 0,
    })),
    nextCursor: hasMore && last ? encodeCursor(last.date, last.id) : null,
  };
}

export type GetTransactionsHistoryResponseType = Awaited<
  ReturnType<typeof getTransactionsHistory>
>;

export type TransactionHistoryRow =
  GetTransactionsHistoryResponseType["transactions"][number];

export async function getBalanceStats(walletId: string, from: Date, to: Date) {
  "use cache";
  cacheLife("minutes");
  cacheTag(walletTag(walletId, CACHE_RESOURCE.transactions));

  const totals = await prisma.transaction.groupBy({
    by: ["type"],
    where: {
      walletId,
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
    expense: moneyText(expense),
    income: moneyText(income),
    net: moneyText(income.minus(expense)),
  };
}

export type GetBalanceStatsResponseType = Awaited<
  ReturnType<typeof getBalanceStats>
>;

export async function getCategoriesStats(
  walletId: string,
  from: Date,
  to: Date,
) {
  "use cache";
  cacheLife("minutes");
  cacheTag(walletTag(walletId, CACHE_RESOURCE.transactions));

  const stats = await prisma.transaction.groupBy({
    by: [
      "type",
      "category",
      "categoryIcon",
      "categoryIconKind",
      "categoryIconColor",
    ],
    where: {
      walletId,
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

  let income = toMoney(0);
  let expense = toMoney(0);
  for (const row of stats) {
    const amount = row._sum.amount ?? toMoney(0);
    if (row.type === "income") {
      income = income.plus(amount);
    } else {
      expense = expense.plus(amount);
    }
  }

  return {
    categories: stats.map((row) => ({
      ...row,
      _sum: {
        ...row._sum,
        amount: row._sum.amount ? moneyText(row._sum.amount) : "0.00",
      },
    })),
    totalIncome: moneyText(income),
    totalExpense: moneyText(expense),
  };
}

export type GetCategoriesStatsResponseType = Awaited<
  ReturnType<typeof getCategoriesStats>
>;

export type TransactionWriteInput = z.output<typeof TransactionDraftSchema> & {
  addedVia?: "agent" | null;
  idempotencyKey?: string;
};

type Clock = () => Date;
type EffectPublisher = (effect: PostCommitEffect) => void;

const systemClock: Clock = () => new Date();
const afterPublisher: EffectPublisher = (effect) => {
  after(effect);
};

export type TransactionRepo = Pick<
  PrismaClient,
  | "transaction"
  | "transactionShare"
  | "wallet"
  | "goal"
  | "walletMembership"
  | "recurringItem"
  | "$transaction"
>;

type CreateTransactionDeps = {
  clock: Clock;
  publisher: EffectPublisher;
  repo: TransactionRepo;
};

type StoredTransaction = NonNullable<
  Awaited<ReturnType<typeof prisma.transaction.findFirst>>
>;

type NewTransaction = {
  walletId: string;
  addedById: string;
  amount: number;
  date: Date;
  description: string;
  type: TransactionType;
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
    existing.category === next.category &&
    existing.addedById === next.addedById &&
    existing.description === next.description &&
    existing.goalId === next.goalId &&
    existing.addedVia === next.addedVia
  );
}

async function resolveIdempotentWrite(
  tx: Prisma.TransactionClient,
  walletId: string,
  key: string | undefined,
  next: NewTransaction,
): Promise<{ existing: StoredTransaction } | { id: string | undefined }> {
  if (!key) return { id: undefined };
  const existing = await tx.transaction.findFirst({
    where: { id: key, walletId },
  });
  if (!existing) return { id: key };
  if (isSameTransaction(existing, next)) return { existing };
  return { id: randomUUID() };
}

export async function writeTransaction(
  caller: Caller,
  input: TransactionWriteInput,
) {
  return writeTransactionWithDeps(caller, input, prisma);
}

export async function writeTransactionWithDeps(
  caller: Caller,
  input: TransactionWriteInput,
  repo: TransactionRepo,
) {
  return input.id
    ? updateTransactionWithDeps(caller, input, repo)
    : createTransactionWithDeps(caller, input, {
        clock: systemClock,
        publisher: afterPublisher,
        repo,
      });
}

async function createTransactionWithDeps(
  caller: Caller,
  input: TransactionWriteInput,
  deps: CreateTransactionDeps,
) {
  assertCallerCanWrite(caller);
  const { walletId, userId } = caller;
  const actor = actorFor(caller);

  const key = readIdempotencyKey(input.idempotencyKey);

  const categoryRow = await requireCategory(
    walletId,
    input.category,
    input.type,
  );

  const parsedBody = TransactionDraftSchema.safeParse({
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

  const [wallet, goal, memberships, recurringItem] = await Promise.all([
    deps.repo.wallet.findUnique({
      where: {
        id: walletId,
      },
      select: {
        currency: true,
      },
    }),
    goalId
      ? deps.repo.goal.findFirst({
          where: {
            id: goalId,
            walletId,
          },
        })
      : null,
    deps.repo.walletMembership.findMany({
      where: {
        walletId,
        leftAt: null,
      },
      select: {
        userId: true,
      },
    }),
    recurringItemId
      ? deps.repo.recurringItem.findFirst({
          where: {
            id: recurringItemId,
            walletId,
          },
        })
      : null,
  ]);

  if (shareInput.length > 0 && type !== "expense") {
    throw new DomainError("Shares are only valid for expenses");
  }

  if (goalId && !goal) {
    throw new DomainError("Goal not found");
  }
  if (recurringItemId && !recurringItem) {
    throw new DomainError("Recurring item not found");
  }

  const formatAmount = getFormatterForCurrency(
    wallet?.currency ?? DEFAULT_CURRENCY,
  ).format;

  const memberIds = new Set(memberships.map((m) => m.userId));
  const shareUserIds = shareInput.map((share) => share.userId);
  const hasForeignOrDuplicateMember =
    shareUserIds.some((shareUserId) => !memberIds.has(shareUserId)) ||
    new Set(shareUserIds).size !== shareUserIds.length;
  if (hasForeignOrDuplicateMember) {
    throw new DomainError(
      "Shares must name each member of this wallet at most once",
    );
  }

  if (!sharesMatchExpense(shareInput, amount)) {
    throw new DomainError(
      `The member shares add up to ${formatAmount(sharesTotal(shareInput).toNumber())} but the expense is ${formatAmount(amount)}.`,
    );
  }

  const thresholdMessage = await assertBudgetAllows({
    walletId,
    currency: wallet?.currency ?? DEFAULT_CURRENCY,
    category: categoryRow.name,
    type,
    amount,
    date,
  });

  const next: NewTransaction = {
    walletId,
    addedById: userId,
    amount,
    date,
    description: description || "",
    type,
    category: categoryRow.name,
    goalId: goalId ?? null,
    addedVia,
  };

  const attemptWrite = async (writeKey: string | undefined) =>
    deps.repo.$transaction(async (tx) => {
      const resolved = await resolveIdempotentWrite(
        tx,
        walletId,
        writeKey,
        next,
      );
      if ("existing" in resolved) {
        return { transaction: resolved.existing, created: false };
      }

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

      await incrementRollups(tx, {
        walletId,
        date,
        type,
        amount: moneyAmount,
      });
      return { transaction, created: true };
    });

  let result: { transaction: StoredTransaction; created: boolean };
  try {
    result = await attemptWrite(key);
  } catch (cause) {
    if (
      key &&
      cause instanceof Prisma.PrismaClientKnownRequestError &&
      cause.code === "P2002"
    ) {
      const existing = await deps.repo.transaction.findFirst({
        where: { id: key, walletId },
      });
      result =
        existing && isSameTransaction(existing, next)
          ? { transaction: existing, created: false }
          : await attemptWrite(undefined);
    } else {
      throw cause;
    }
  }

  if (result.created) {
    await publishWalletChange({
      walletId,
      actor,
      resource: "transactions",
      message: `added ${description || categoryRow.name}, ${formatAmount(amount)}`,
    });
  }

  const effects = buildPostCommitEffects({
    actor,
    walletId,
    userId,
    actorName: caller.actorName,
    categoryName: categoryRow.name,
    amount,
    description: description ?? "",
    type,
    formattedAmount: formatAmount(amount),
    formatAmount,
    thresholdMessage,
    goal: goal ? { id: goal.id, name: goal.name, target: goal.target } : null,
  });
  for (const effect of effects) {
    deps.publisher(effect);
  }

  return result.transaction;
}

export async function deleteTransaction(caller: Caller, id: string) {
  const { walletId } = caller;

  const parsedId = DeleteIdSchema.safeParse({ id });
  if (!parsedId.success) {
    throw new DomainError(
      parsedId.error.issues[0]?.message ?? "Transaction not found",
    );
  }

  const transaction = await prisma.transaction.findUnique({
    where: {
      walletId,
      id,
    },
  });

  if (!transaction) {
    throw new DomainError("Transaction not found");
  }

  assertCallerCanEditEntry(caller, transaction.addedById);

  await prisma.$transaction(async (tx) => {
    const deleted = await tx.transaction.deleteMany({
      where: {
        id,
        walletId,
      },
    });
    if (deleted.count === 0) {
      throw new DomainError("Transaction not found");
    }

    await decrementRollups(tx, {
      walletId,
      date: transaction.date,
      type: transaction.type,
      amount: transaction.amount,
    });
  });

  await publishWalletChange({
    walletId,
    actor: actorFor(caller),
    resource: "transactions",
    message: `removed ${transaction.description || transaction.category}`,
  });
}

// seam-parse-exempt: the id comes from the caller's own scoped row, which is
// re-read and permission checked before any write.
async function updateTransactionWithDeps(
  caller: Caller,
  input: TransactionWriteInput,
  repo: TransactionRepo,
) {
  const { walletId } = caller;
  const parsedId = DeleteIdSchema.safeParse({ id: input.id });
  if (!parsedId.success) {
    throw new DomainError("Transaction not found");
  }
  const id = parsedId.data.id;

  const existing = await repo.transaction.findUnique({
    where: { walletId, id },
  });
  if (!existing) {
    throw new DomainError("Transaction not found");
  }
  assertCallerCanEditEntry(caller, existing.addedById);

  const shareCount = await repo.transactionShare.count({
    where: { transactionId: id, transaction: { walletId } },
  });
  if (shareCount > 0) {
    throw new DomainError(
      "Split expenses cannot be edited until share editing is available",
    );
  }

  const categoryRow = await requireCategory(
    walletId,
    input.category,
    input.type,
  );
  const parsed = TransactionDraftSchema.safeParse({
    ...input,
    category: categoryRow.name,
  });
  if (!parsed.success) {
    throw new DomainError(
      parsed.error.issues[0]?.message ?? "Invalid transaction input",
    );
  }

  const { amount, date, description, type } = parsed.data;
  const goalId = parsed.data.goalId || undefined;
  const goal = goalId
    ? await repo.goal.findFirst({
        where: { id: goalId, walletId },
        select: { id: true, name: true, target: true },
      })
    : null;
  if (goalId && !goal) {
    throw new DomainError("Goal not found");
  }
  const moneyAmount = toMoney(amount);
  const wallet = await repo.wallet.findUnique({
    where: { id: walletId },
    select: { currency: true },
  });
  const formatAmount = getFormatterForCurrency(
    wallet?.currency ?? DEFAULT_CURRENCY,
  ).format;

  await assertBudgetAllows({
    walletId,
    currency: wallet?.currency ?? DEFAULT_CURRENCY,
    category: categoryRow.name,
    type,
    amount,
    date,
    excludeTransactionId: id,
  });

  const moneyChanged =
    !existing.amount.eq(moneyAmount) ||
    existing.type !== type ||
    existing.date.getTime() !== date.getTime();

  const updated = await repo.$transaction(async (tx) => {
    if (moneyChanged) {
      await decrementRollups(tx, {
        walletId,
        date: existing.date,
        type: existing.type,
        amount: existing.amount,
      });
      await incrementRollups(tx, {
        walletId,
        date,
        type,
        amount: moneyAmount,
      });
    }

    const row = await tx.transaction.update({
      where: { id, walletId },
      data: {
        amount,
        date,
        description: description || "",
        type,
        category: categoryRow.name,
        goalId: goal?.id ?? null,
        ...categoryIconSnapshot(categoryRow),
      },
    });

    return row;
  });

  await publishWalletChange({
    walletId,
    actor: actorFor(caller),
    resource: "transactions",
    message: `updated ${description || categoryRow.name}, ${formatAmount(amount)}`,
  });

  return updated;
}
