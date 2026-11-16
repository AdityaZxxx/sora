import { withHouseholdRoute } from "@/lib/api-route";
import { getSimplifiedTransfers } from "@/lib/balances";

export async function GET() {
  return withHouseholdRoute(async (result) => {
    const transfers = await getSimplifiedTransfers(result.household.id);

    return Response.json(transfers);
  });
}
