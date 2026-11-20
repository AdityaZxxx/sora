import { jsonReadResponse, withHouseholdRoute } from "@/lib/api-route";
import { listMembers } from "@/lib/members";

export async function GET(request: Request) {
  return withHouseholdRoute(async (result) => {
    const members = await listMembers(result.household.id);
    return jsonReadResponse(request, members);
  });
}
