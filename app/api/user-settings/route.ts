import { jsonReadResponse, withHouseholdRoute } from "@/lib/api-route";

export async function GET(request: Request) {
  return withHouseholdRoute(async (result) => {
    return jsonReadResponse(request, result.household);
  });
}
