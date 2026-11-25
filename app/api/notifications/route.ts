import { jsonReadResponse, withWalletRoute } from "@/lib/api-route";
import { listNotifications } from "@/lib/notifications";

export async function GET(request: Request) {
  return withWalletRoute(async (result) => {
    const notifications = await listNotifications(
      result.wallet.id,
      result.session.user.id,
    );
    return jsonReadResponse(request, notifications);
  });
}
