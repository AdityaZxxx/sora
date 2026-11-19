import { jsonReadResponse, withHouseholdRoute } from "@/lib/api-route";
import { getSharedSpending } from "@/lib/budgets";

export async function GET(request: Request) {
  return withHouseholdRoute(async (result) => {
    const stats = await getSharedSpending(result.household.id);

    return jsonReadResponse(request, stats);
  });
}

export type { GetSharedSpendingResponseType } from "@/lib/budgets";
