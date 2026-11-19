import { jsonReadResponse, withHouseholdRoute } from "@/lib/api-route";
import { getMemberBalances } from "@/lib/balances";

export async function GET(request: Request) {
  return withHouseholdRoute(async (result) => {
    const balances = await getMemberBalances(
      result.household.id,
      result.session.user.id,
    );

    return jsonReadResponse(request, balances);
  });
}
