import { jsonReadResponse, withWalletRoute } from "@/lib/api-route";
import { getSimplifiedTransfers } from "@/lib/balances";

export async function GET(request: Request) {
  return withWalletRoute(async (result) => {
    const transfers = await getSimplifiedTransfers(result.wallet.id);

    return jsonReadResponse(request, transfers);
  });
}
