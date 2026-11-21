import { Prisma } from "@prisma/client";
import { cacheLife, cacheTag } from "next/cache";

import { CACHE_RESOURCE, householdTag } from "@/lib/cache";
import { requireCategory } from "@/lib/categories";
import { previousMonthRange, utcMonthRangeFor } from "@/lib/dates";
import { DomainError } from "@/lib/errors";
import { getFormatterForCurrency } from "@/lib/helpers";
import prisma from "@/lib/prisma";
import { publishHouseholdChange } from "@/lib/realtime";
import { assertFullMemberRole, type MemberRole } from "@/lib/roles";
import { settlementCategoryExclusion } from "@/lib/settlements";
import { CreateBudgetSchema, UpdateBudgetSchema } from "@/schemas/budgets";
import { DeleteIdSchema } from "@/schemas/delete";

export async function getSharedSpending(householdId: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(householdTag(householdId, CACHE_RESOURCE.budgets));

  const now = new Date();
  const ranges = [utcMonthRangeFor(now), previousMonthRange(now)];

  const [thisMonth, lastMonth] = await Promise.all(
    ranges.map((range) =>
      prisma.transaction.aggregate({
        where: {
          householdId,
          shared: true,
          type: "expense" as const,
          category: settlementCategoryExclusion(),
          date: {
            gte: range.from,
            lte: range.to,
          },
        },
        _sum: {
          amount: true,
        },
      }),
    ),
  );

  return {
    thisMonth: thisMonth._sum.amount?.toNumber() ?? 0,
    lastMonth: lastMonth._sum.amount?.toNumber() ?? 0,
  };
}

export type GetSharedSpendingResponseType = Awaited<
  ReturnType<typeof getSharedSpending>
>;

export async function getMonthSpentByCategory(
  householdId: string,
  date: Date,
): Promise<Map<string, Prisma.Decimal>> {
  const { from, to } = utcMonthRangeFor(date);
  const rows = await prisma.transaction.groupBy({
    by: ["category"],
    where: {
      householdId,
      shared: true,
      type: "expense" as const,
      category: settlementCategoryExclusion(),
      date: {
        gte: from,
        lte: to,
      },
    },
    _sum: {
      amount: true,
    },
  });
  return new Map(
    rows.map((row) => [row.category, row._sum.amount ?? new Prisma.Decimal(0)]),
  );
}

export async function getBudgetsWithProgress(householdId: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(householdTag(householdId, CACHE_RESOURCE.budgets));

  const [budgets, spentByCategory] = await Promise.all([
    prisma.budget.findMany({
      where: {
        householdId,
      },
      select: {
        id: true,
        category: true,
        amount: true,
        mode: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),
    getMonthSpentByCategory(householdId, new Date()),
  ]);

  return budgets.map((budget) => {
    const spent = spentByCategory.get(budget.category) ?? new Prisma.Decimal(0);
    const remaining = budget.amount.minus(spent);
    return {
      ...budget,
      amount: budget.amount.toNumber(),
      spent: spent.toNumber(),
      remaining: remaining.toDecimalPlaces(2).toNumber(),
      percent: budget.amount.isZero()
        ? 0
        : spent.div(budget.amount).times(100).toDecimalPlaces(2).toNumber(),
    };
  });
}

export type BudgetWithProgress = Awaited<
  ReturnType<typeof getBudgetsWithProgress>
>[number];

export type BudgetMode = "soft" | "hard";

export type CreateBudgetInput = {
  category: string;
  amount: number;
  mode: BudgetMode;
};

export type UpdateBudgetInput = CreateBudgetInput & {
  id: string;
};

export async function createHouseholdBudget(
  householdId: string,
  input: CreateBudgetInput,
  role: MemberRole,
) {
  assertFullMemberRole(role);
  const parsed = CreateBudgetSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError(parsed.error.issues[0]?.message ?? "Invalid budget");
  }

  const { category, amount, mode } = parsed.data;
  const expenseCategory = await requireCategory(
    householdId,
    category,
    "expense",
  );

  const budget = await prisma.budget.create({
    data: {
      householdId,
      category: expenseCategory.name,
      amount,
      mode,
    },
  });

  await publishHouseholdChange({
    householdId,
    resource: "budgets",
    message: `added a ${expenseCategory.name} budget`,
  });

  return { ...budget, amount: budget.amount.toNumber() };
}

export async function updateHouseholdBudget(
  householdId: string,
  input: UpdateBudgetInput,
  role: MemberRole,
) {
  assertFullMemberRole(role);
  const parsed = UpdateBudgetSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError(parsed.error.issues[0]?.message ?? "Invalid budget");
  }

  const { id, category, amount, mode } = parsed.data;
  const expenseCategory = await requireCategory(
    householdId,
    category,
    "expense",
  );

  const budget = await prisma.budget.update({
    where: {
      id,
      householdId,
    },
    data: {
      category: expenseCategory.name,
      amount,
      mode,
    },
  });

  await publishHouseholdChange({
    householdId,
    resource: "budgets",
    message: `changed the ${expenseCategory.name} budget`,
  });

  return { ...budget, amount: budget.amount.toNumber() };
}

export async function setHouseholdBudget(
  householdId: string,
  input: CreateBudgetInput,
  role: MemberRole,
) {
  const parsed = CreateBudgetSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError(parsed.error.issues[0]?.message ?? "Invalid budget");
  }

  const existing = await prisma.budget.findFirst({
    where: {
      householdId,
      category: parsed.data.category,
    },
  });

  if (existing) {
    return await updateHouseholdBudget(
      householdId,
      { ...input, id: existing.id },
      role,
    );
  }

  return await createHouseholdBudget(householdId, input, role);
}

export async function deleteHouseholdBudget(
  householdId: string,
  id: string,
  role: MemberRole,
) {
  assertFullMemberRole(role);

  const parsedId = DeleteIdSchema.safeParse({ id });
  if (!parsedId.success) {
    throw new DomainError(
      parsedId.error.issues[0]?.message ?? "Budget not found",
    );
  }

  const budget = await prisma.budget.findFirst({
    where: {
      id,
      householdId,
    },
  });
  if (!budget) {
    throw new DomainError("Budget not found");
  }

  const deleted = await prisma.budget.deleteMany({
    where: {
      id,
      householdId,
    },
  });
  if (deleted.count === 0) {
    throw new DomainError("Budget not found");
  }

  await publishHouseholdChange({
    householdId,
    resource: "budgets",
    message: `removed the ${budget.category} budget`,
  });

  return { ...budget, amount: budget.amount.toNumber() };
}

export type BudgetGateInput = {
  householdId: string;
  currency: string;
  category: string;
  type: string;
  shared: boolean;
  amount: number;
  date: Date;
};

export async function assertBudgetAllows(input: BudgetGateInput) {
  const { householdId, currency, category, type, shared, amount, date } = input;
  if (type !== "expense" || !shared) {
    return null;
  }

  const budget = await prisma.budget.findUnique({
    where: {
      householdId_category: {
        householdId,
        category,
      },
    },
  });
  if (!budget) {
    return null;
  }

  const formatAmount = getFormatterForCurrency(currency).format;
  const spentByCategory = await getMonthSpentByCategory(householdId, date);
  const spentBefore = spentByCategory.get(category) ?? new Prisma.Decimal(0);
  const spentAfter = spentBefore.plus(amount);
  const budgetAmount = budget.amount;
  const beforePercent = budgetAmount.isZero()
    ? 0
    : spentBefore.div(budgetAmount).times(100).toNumber();
  const afterPercent = budgetAmount.isZero()
    ? 0
    : spentAfter.div(budgetAmount).times(100).toNumber();

  if (budget.mode === "hard" && spentAfter.gt(budgetAmount)) {
    throw new DomainError(
      `Hard budget exceeded for ${category}: the monthly limit is ${formatAmount(budgetAmount.toNumber())} and ${formatAmount(spentBefore.toNumber())} is already spent, so this ${formatAmount(amount)} expense would bring the month to ${formatAmount(spentAfter.toNumber())}.`,
    );
  }

  if (beforePercent < 100 && afterPercent >= 100) {
    return `${category} budget reached 100% of ${formatAmount(budgetAmount.toNumber())} this month (${formatAmount(spentAfter.toNumber())} spent).`;
  }
  if (beforePercent < 80 && afterPercent >= 80) {
    return `${category} budget reached 80% of ${formatAmount(budgetAmount.toNumber())} this month (${formatAmount(spentAfter.toNumber())} spent).`;
  }
  return null;
}
