import { jsonReadResponse, withWalletRoute } from "@/lib/api-route";
import { listInviteLinks } from "@/lib/invites";

export async function GET(request: Request) {
  return withWalletRoute(async (result) => {
    const inviteLinks = await listInviteLinks(result.wallet.id);
    return jsonReadResponse(request, inviteLinks);
  });
}
