import { Prisma } from "@prisma/client";

import {
  FULL_MEMBER_ROLE,
  UNUSUAL_SPENDING_TYPE,
  DEFAULT_CURRENCY,
} from "@/lib/constants";
import { getFormatterForCurrency } from "@/lib/helpers";
import { sumMoney, zeroMoney, type Money } from "@/lib/money";
import { notifyMembers } from "@/lib/notifications";
import prisma from "@/lib/prisma";
import { isSettlementCategory } from "@/lib/settlements";

const { Decimal } = Prisma;
const FLOOR_MINIMUM = new Decimal(100);
const INCOME_FLOOR_RATIO = new Decimal("0.005");
const SPIKE_MULTIPLIER = new Decimal(2);

export type SpendingCandidate = {
  amount: Money;
  category: string;
  description: string;
  type: string;
  shared: boolean;
  householdId: string;
  userId: string;
};

type Window = { start: Date; end: Date };

export function trailingWindow(now: Date = new Date()): Window {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3, 1),
  );
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return { start, end };
}

async function trailingMonthlyIncome(householdId: string, window: Window) {
  const months: { year: number; month: number }[] = [];
  const cursor = new Date(window.start.getTime());
  for (let index = 0; index < 3; index += 1) {
    months.push({
      year: cursor.getUTCFullYear(),
      month: cursor.getUTCMonth(),
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  const rows = await prisma.monthHistory.findMany({
    where: {
      householdId,
      OR: months,
    },
  });
  return sumMoney(rows.map((row) => row.income)).div(3);
}

export function floorFor(trailingIncome: Money) {
  const ratioFloor = trailingIncome
    .times(INCOME_FLOOR_RATIO)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  return ratioFloor.gt(FLOOR_MINIMUM) ? ratioFloor : FLOOR_MINIMUM;
}

export async function evaluateUnusualSpending(
  transaction: SpendingCandidate,
): Promise<{ notified: number }> {
  if (transaction.type !== "expense") {
    return { notified: 0 };
  }
  if (isSettlementCategory(transaction.category)) {
    return { notified: 0 };
  }

  const window = trailingWindow();

  const sharedScope = transaction.shared
    ? { shared: true }
    : { shared: false, addedById: transaction.userId };

  const [baseline, trailingIncome] = await Promise.all([
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        householdId: transaction.householdId,
        category: transaction.category,
        type: "expense",
        ...sharedScope,
        date: { gte: window.start, lt: window.end },
      },
    }),
    trailingMonthlyIncome(transaction.householdId, window),
  ]);

  const average = (baseline._sum.amount ?? zeroMoney()).div(3);
  if (average.lt(floorFor(trailingIncome))) {
    return { notified: 0 };
  }
  if (transaction.amount.lte(SPIKE_MULTIPLIER.times(average))) {
    return { notified: 0 };
  }

  const household = await prisma.household.findUnique({
    where: { id: transaction.householdId },
    select: { currency: true },
  });
  const format = getFormatterForCurrency(
    household?.currency ?? DEFAULT_CURRENCY,
  ).format;

  const recipients = transaction.shared
    ? await prisma.householdMembership.findMany({
        where: {
          householdId: transaction.householdId,
          role: FULL_MEMBER_ROLE,
        },
        select: { userId: true },
      })
    : [{ userId: transaction.userId }];

  const message = `Unusual spending: ${format(transaction.amount.toNumber())} on ${transaction.description || transaction.category} (${transaction.category}) is more than twice the three-month average of ${format(average.toNumber())}.`;

  await notifyMembers(
    transaction.householdId,
    recipients.map((recipient) => recipient.userId),
    UNUSUAL_SPENDING_TYPE,
    message,
  );
  return { notified: recipients.length };
}
