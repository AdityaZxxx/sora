import type { Period, Timeframe } from "@/lib/types";

import { getDaysInMonth } from "date-fns";

import prisma from "@/lib/prisma";

type HistoryData = {
  year: number;
  month: number;
  expense: number;
  income: number;
  day?: number;
};

export async function getHistoryData(
  householdId: string,
  timeframe: Timeframe,
  period: Period,
) {
  switch (timeframe) {
    case "year":
      return await getYearHistoryData(householdId, period.year);
    case "month":
      return await getMonthHistoryData(householdId, period.year, period.month);
  }
}

export type GetHistoryDataResponseType = Awaited<
  ReturnType<typeof getHistoryData>
>;

async function getYearHistoryData(householdId: string, year: number) {
  const result = await prisma.yearHistory.groupBy({
    by: ["month"],
    where: { householdId, year },
    _sum: { expense: true, income: true },
    orderBy: [{ month: "asc" }],
  });

  if (!result || result.length === 0) return [];

  const dataMap = new Map(result.map((row) => [row.month, row._sum]));
  const history: HistoryData[] = [];

  for (let i = 0; i < 12; i++) {
    const monthData = dataMap.get(i);
    history.push({
      year,
      month: i,
      expense: monthData?.expense?.toNumber() ?? 0,
      income: monthData?.income?.toNumber() ?? 0,
    });
  }
  return history;
}

async function getMonthHistoryData(
  householdId: string,
  year: number,
  month: number,
) {
  const result = await prisma.monthHistory.groupBy({
    by: ["day"],
    where: { householdId, year, month },
    _sum: { expense: true, income: true },
    orderBy: [{ day: "asc" }],
  });

  if (!result || result.length === 0) return [];

  const history: HistoryData[] = [];
  const dataMap = new Map(result.map((row) => [row.day, row._sum]));

  const daysInMonth = getDaysInMonth(new Date(year, month));
  for (let i = 1; i <= daysInMonth; i++) {
    const dayData = dataMap.get(i);
    history.push({
      expense: dayData?.expense?.toNumber() ?? 0,
      income: dayData?.income?.toNumber() ?? 0,
      year,
      month,
      day: i,
    });
  }

  return history;
}
