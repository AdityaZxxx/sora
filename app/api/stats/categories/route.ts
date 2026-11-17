import { dateRangeFromParams, withHouseholdRoute } from "@/lib/api-route";
import prisma from "@/lib/prisma";
import { settlementCategoryExclusion } from "@/lib/settlements";

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  return withHouseholdRoute(async (result) => {
    const range = dateRangeFromParams(searchParams);

    const stats = await getCategoriesStats(
      result.household.id,
      range.from,
      range.to,
    );
    return Response.json(stats);
  });
}

export type GetCategoriesStatsResponseType = Awaited<
  ReturnType<typeof getCategoriesStats>
>;

async function getCategoriesStats(householdId: string, from: Date, to: Date) {
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
