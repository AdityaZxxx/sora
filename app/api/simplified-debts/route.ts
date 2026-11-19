import { jsonReadResponse, withHouseholdRoute } from "@/lib/api-route";
import { getSimplifiedTransfers } from "@/lib/balances";

export async function GET(request: Request) {
  return withHouseholdRoute(async (result) => {
    const transfers = await getSimplifiedTransfers(result.household.id);

    return jsonReadResponse(request, transfers);
  });
}
