import { jsonReadResponse, withWalletRoute } from "@/lib/api-route";
import { getMemberBalances } from "@/lib/balances";

export async function GET(request: Request) {
  return withWalletRoute(async (result) => {
    const balances = await getMemberBalances(
      result.wallet.id,
      result.session.user.id,
    );

    return jsonReadResponse(request, balances);
  });
}
