import { jsonReadResponse, withHouseholdRoute } from "@/lib/api-route";
import { listHouseholdsForMember } from "@/lib/household";

export async function GET(request: Request) {
  return withHouseholdRoute(async (result) => {
    const households = await listHouseholdsForMember(
      result.session.user.id,
      result.household.id,
    );
    return jsonReadResponse(request, households);
  });
}
