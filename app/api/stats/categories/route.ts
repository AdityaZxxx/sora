import { dateRangeFromParams, withHouseholdRoute } from "@/lib/api-route";
import { getCategoriesStats } from "@/lib/transactions";

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
