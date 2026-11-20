import { jsonReadResponse, withHouseholdRoute } from "@/lib/api-route";
import { listRecurringItems } from "@/lib/recurring";

export async function GET(request: Request) {
  return withHouseholdRoute(async (result) => {
    const items = await listRecurringItems(result.household.id);
    return jsonReadResponse(request, items);
  });
}
