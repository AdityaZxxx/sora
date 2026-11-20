import { jsonReadResponse, withHouseholdRoute } from "@/lib/api-route";
import { listInviteLinks } from "@/lib/invites";

export async function GET(request: Request) {
  return withHouseholdRoute(async (result) => {
    const inviteLinks = await listInviteLinks(result.household.id);
    return jsonReadResponse(request, inviteLinks);
  });
}
