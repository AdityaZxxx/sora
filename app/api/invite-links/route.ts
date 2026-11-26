import { jsonReadResponse, rejection, withWalletRoute } from "@/lib/api-route";
import { assertCallerCanManage } from "@/lib/caller";
import { DomainError } from "@/lib/errors";
import { listInviteLinks } from "@/lib/invites";

export async function GET(request: Request) {
  return withWalletRoute(async (result) => {
    try {
      assertCallerCanManage(result.caller);
    } catch (cause) {
      if (cause instanceof DomainError) {
        return rejection(cause.message, 403);
      }
      throw cause;
    }
    const inviteLinks = await listInviteLinks(result.wallet.id);
    return jsonReadResponse(request, inviteLinks);
  });
}
