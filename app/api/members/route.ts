import { jsonReadResponse, withWalletRoute } from "@/lib/api-route";
import { listMembers } from "@/lib/members";

export async function GET(request: Request) {
  return withWalletRoute(async (result) => {
    const members = await listMembers(result.wallet.id);
    return jsonReadResponse(request, members);
  });
}
