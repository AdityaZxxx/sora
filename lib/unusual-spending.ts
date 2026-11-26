import type { Actor } from "@/lib/caller";
import type { PrismaClient } from "@prisma/client";

import { Prisma } from "@prisma/client";

import {
  FULL_MEMBER_ROLE,
  UNUSUAL_SPENDING_TYPE,
  DEFAULT_CURRENCY,
} from "@/lib/constants";
import { getFormatterForCurrency } from "@/lib/helpers";
import { sumMoney, zeroMoney, type Money } from "@/lib/money";

const { Decimal } = Prisma;
const FLOOR_MINIMUM = new Decimal(100);
const INCOME_FLOOR_RATIO = new Decimal("0.005");
const SPIKE_MULTIPLIER = new Decimal(2);

export type SpendingCandidate = {
  amount: Money;
  category: string;
  description: string;
  type: string;
  walletId: string;
  userId: string;
};

type Window = { start: Date; end: Date };

export type UnusualSpendingDeps = {
  actor: Actor;
  clock: () => Date;
  repo: Pick<
    PrismaClient,
    "transaction" | "monthHistory" | "wallet" | "walletMembership"
  >;
  notifier: (
    actor: Actor,
    walletId: string,
    userIds: string[],
    type: string,
    message: string,
  ) => Promise<void>;
};

function trailingWindow(now: Date): Window {
  return {
    start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3, 1)),
    end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
  };
}

function floorFor(trailingIncome: Money) {
  const ratioFloor = trailingIncome
    .times(INCOME_FLOOR_RATIO)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  return ratioFloor.gt(FLOOR_MINIMUM) ? ratioFloor : FLOOR_MINIMUM;
}

async function trailingMonthlyIncome(
  repo: UnusualSpendingDeps["repo"],
  walletId: string,
  window: Window,
) {
  const months: { year: number; month: number }[] = [];
  const cursor = new Date(window.start.getTime());
  for (let index = 0; index < 3; index += 1) {
    months.push({
      year: cursor.getUTCFullYear(),
      month: cursor.getUTCMonth(),
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  const rows = await repo.monthHistory.findMany({
    where: {
      walletId,
      OR: months,
    },
  });
  return sumMoney(rows.map((row) => row.income)).div(3);
}

export async function evaluateUnusualSpending(
  transaction: SpendingCandidate,
  deps: UnusualSpendingDeps,
): Promise<{ notified: number }> {
  if (transaction.type !== "expense") {
    return { notified: 0 };
  }
  const window = trailingWindow(deps.clock());

  const [baseline, trailingIncome] = await Promise.all([
    deps.repo.transaction.aggregate({
      _sum: { amount: true },
      where: {
        walletId: transaction.walletId,
        category: transaction.category,
        type: "expense",
        date: { gte: window.start, lt: window.end },
      },
    }),
    trailingMonthlyIncome(deps.repo, transaction.walletId, window),
  ]);

  const average = (baseline._sum.amount ?? zeroMoney()).div(3);
  if (average.lt(floorFor(trailingIncome))) {
    return { notified: 0 };
  }
  if (transaction.amount.lte(SPIKE_MULTIPLIER.times(average))) {
    return { notified: 0 };
  }

  const wallet = await deps.repo.wallet.findUnique({
    where: { id: transaction.walletId },
    select: { currency: true },
  });
  const format = getFormatterForCurrency(
    wallet?.currency ?? DEFAULT_CURRENCY,
  ).format;

  const recipients = await deps.repo.walletMembership.findMany({
    where: {
      walletId: transaction.walletId,
      role: FULL_MEMBER_ROLE,
    },
    select: { userId: true },
  });

  const message = `Unusual spending: ${format(transaction.amount.toNumber())} on ${transaction.description || transaction.category} (${transaction.category}) is more than twice the three-month average of ${format(average.toNumber())}.`;

  await deps.notifier(
    deps.actor,
    transaction.walletId,
    recipients.map((recipient) => recipient.userId),
    UNUSUAL_SPENDING_TYPE,
    message,
  );
  return { notified: recipients.length };
}
