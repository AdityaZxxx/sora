import { jsonReadResponse, withHouseholdRoute } from "@/lib/api-route";
import { getMonthlyRollup } from "@/lib/insights";

export async function GET(request: Request) {
  return withHouseholdRoute(async (result) => {
    const months = await getMonthlyRollup(result.household.id);
    return jsonReadResponse(request, months);
  });
}

export type GetInsightsResponseType = Awaited<
  ReturnType<typeof getMonthlyRollup>
>;
