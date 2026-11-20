import { jsonReadResponse, withHouseholdRoute } from "@/lib/api-route";
import { listApiTokens } from "@/lib/api-token";

export async function GET(request: Request) {
  return withHouseholdRoute(async (result) => {
    const tokens = await listApiTokens(result.household.id);
    return jsonReadResponse(request, tokens);
  });
}
