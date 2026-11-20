import { jsonReadResponse, withHouseholdRoute } from "@/lib/api-route";
import { getGoalsWithProgress } from "@/lib/goals";

export async function GET(request: Request) {
  return withHouseholdRoute(async (result) => {
    const goals = await getGoalsWithProgress(result.household.id);
    return jsonReadResponse(request, goals);
  });
}
