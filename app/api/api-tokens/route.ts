import { jsonReadResponse, withWalletRoute } from "@/lib/api-route";
import { listApiTokens } from "@/lib/api-token";

export async function GET(request: Request) {
  return withWalletRoute(async (result) => {
    const tokens = await listApiTokens(result.wallet.id);
    return jsonReadResponse(request, tokens);
  });
}
