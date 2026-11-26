import { jsonReadResponse, withWalletRoute } from "@/lib/api-route";
import { listFormerMembers } from "@/lib/members";

export async function GET(request: Request) {
  return withWalletRoute(async (result) => {
    const formerMembers = await listFormerMembers(result.wallet.id);
    return jsonReadResponse(request, formerMembers);
  });
}
