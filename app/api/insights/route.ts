import { withHouseholdRoute } from "@/lib/api-route";
import { getMonthlyRollup } from "@/lib/insights";

export async function GET() {
  return withHouseholdRoute(async (result) => {
    const months = await getMonthlyRollup(result.household.id);
    return Response.json(months);
  });
}

export type GetInsightsResponseType = Awaited<
  ReturnType<typeof getMonthlyRollup>
>;
