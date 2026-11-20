import { jsonReadResponse, withHouseholdRoute } from "@/lib/api-route";
import { getBudgetsWithProgress } from "@/lib/budgets";

export async function GET(request: Request) {
  return withHouseholdRoute(async (result) => {
    const budgets = await getBudgetsWithProgress(result.household.id);
    return jsonReadResponse(request, budgets);
  });
}
