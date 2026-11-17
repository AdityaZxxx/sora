import { monthOffsets } from "@/lib/dates";
import prisma from "@/lib/prisma";

export async function getMonthlyRollup(householdId: string) {
  const months = monthOffsets(6);

  const rows = await prisma.monthHistory.groupBy({
    by: ["year", "month"],
    where: {
      householdId,
      OR: months.map(({ year, month }) => ({ year, month })),
    },
    _sum: {
      income: true,
      expense: true,
    },
  });

  const byKey = new Map(
    rows.map((row) => [
      `${row.year}-${row.month}`,
      {
        income: row._sum.income?.toNumber() ?? 0,
        expense: row._sum.expense?.toNumber() ?? 0,
      },
    ]),
  );

  return months.map(({ year, month }) => ({
    year,
    month,
    income: byKey.get(`${year}-${month}`)?.income ?? 0,
    expense: byKey.get(`${year}-${month}`)?.expense ?? 0,
  }));
}

export type MonthlyRollup = Awaited<ReturnType<typeof getMonthlyRollup>>;
