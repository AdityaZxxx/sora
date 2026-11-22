import type { Prisma } from "@prisma/client";

import { zeroMoney, type Money } from "@/lib/money";

type RollupClient = Prisma.TransactionClient;

export type RollupEntry = {
  householdId: string;
  date: Date;
  type: string;
  amount: Money;
};

function monthBucket(date: Date) {
  return {
    day: date.getUTCDate(),
    month: date.getUTCMonth(),
    year: date.getUTCFullYear(),
  };
}

function yearBucket(date: Date) {
  return {
    month: date.getUTCMonth(),
    year: date.getUTCFullYear(),
  };
}

function expensePart({ type, amount }: RollupEntry): Money {
  return type === "expense" ? amount : zeroMoney();
}

function incomePart({ type, amount }: RollupEntry): Money {
  return type === "income" ? amount : zeroMoney();
}

// seam-parse-exempt: called only by the transaction seam with values it already parsed.
export async function incrementRollups(
  tx: RollupClient,
  entry: RollupEntry,
): Promise<void> {
  const { householdId, date } = entry;
  const expense = expensePart(entry);
  const income = incomePart(entry);

  await tx.monthHistory.upsert({
    where: {
      householdId_day_month_year: {
        householdId,
        ...monthBucket(date),
      },
    },
    create: {
      householdId,
      ...monthBucket(date),
      expense,
      income,
    },
    update: {
      expense: {
        increment: expense,
      },
      income: {
        increment: income,
      },
    },
  });

  await tx.yearHistory.upsert({
    where: {
      householdId_month_year: {
        householdId,
        ...yearBucket(date),
      },
    },
    create: {
      householdId,
      ...yearBucket(date),
      expense,
      income,
    },
    update: {
      expense: {
        increment: expense,
      },
      income: {
        increment: income,
      },
    },
  });
}

// seam-parse-exempt: called only by the transaction seam with values it already parsed.
export async function decrementRollups(
  tx: RollupClient,
  entry: RollupEntry,
): Promise<void> {
  const { householdId, date, type, amount } = entry;

  await tx.monthHistory.update({
    where: {
      householdId_day_month_year: {
        householdId,
        ...monthBucket(date),
      },
    },
    data: {
      ...(type === "expense" && {
        expense: {
          decrement: amount,
        },
      }),
      ...(type === "income" && {
        income: {
          decrement: amount,
        },
      }),
    },
  });

  await tx.yearHistory.update({
    where: {
      householdId_month_year: {
        householdId,
        ...yearBucket(date),
      },
    },
    data: {
      ...(type === "expense" && {
        expense: {
          decrement: amount,
        },
      }),
      ...(type === "income" && {
        income: {
          decrement: amount,
        },
      }),
    },
  });
}
