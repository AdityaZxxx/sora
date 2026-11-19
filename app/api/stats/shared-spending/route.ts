import { withHouseholdRoute } from "@/lib/api-route";
import { getSharedSpending } from "@/lib/budgets";

export async function GET() {
  return withHouseholdRoute(async (result) => {
    const stats = await getSharedSpending(result.household.id);

    return Response.json(stats);
  });
}

export type { GetSharedSpendingResponseType } from "@/lib/budgets";
