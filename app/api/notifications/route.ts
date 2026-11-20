import { jsonReadResponse, withHouseholdRoute } from "@/lib/api-route";
import { listNotifications } from "@/lib/notifications";

export async function GET(request: Request) {
  return withHouseholdRoute(async (result) => {
    const notifications = await listNotifications(
      result.household.id,
      result.session.user.id,
    );
    return jsonReadResponse(request, notifications);
  });
}
