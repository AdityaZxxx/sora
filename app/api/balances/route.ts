import { withHouseholdRoute } from "@/lib/api-route";
import { getMemberBalances } from "@/lib/balances";

export async function GET() {
  return withHouseholdRoute(async (result) => {
    const balances = await getMemberBalances(
      result.household.id,
      result.session.user.id,
    );

    return Response.json(balances);
  });
}
