import { cacheLife, cacheTag } from "next/cache";

import { CACHE_RESOURCE, walletTag } from "@/lib/cache";
import { monthOffsets } from "@/lib/dates";
import { moneyText, toMoney } from "@/lib/money";
import prisma from "@/lib/prisma";

export async function getMonthlyRollup(walletId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(walletTag(walletId, CACHE_RESOURCE.insights));

  const months = monthOffsets(6);

  const rows = await prisma.monthHistory.groupBy({
    by: ["year", "month"],
    where: {
      walletId,
      OR: months.map(({ year, month }) => ({ year, month })),
    },
    _sum: {
      income: true,
      expense: true,
    },
  });

  const byKey = new Map(
    rows.map((row) => {
      const income = row._sum.income ?? toMoney(0);
      const expense = row._sum.expense ?? toMoney(0);
      return [
        `${row.year}-${row.month}`,
        {
          income: moneyText(income),
          expense: moneyText(expense),
          savingsRate: income.isZero()
            ? 0
            : income.minus(expense).div(income).toNumber(),
        },
      ];
    }),
  );

  return months.map(({ year, month }) => ({
    year,
    month,
    income: byKey.get(`${year}-${month}`)?.income ?? "0.00",
    expense: byKey.get(`${year}-${month}`)?.expense ?? "0.00",
    savingsRate: byKey.get(`${year}-${month}`)?.savingsRate ?? 0,
  }));
}

export type MonthlyRollup = Awaited<ReturnType<typeof getMonthlyRollup>>;
