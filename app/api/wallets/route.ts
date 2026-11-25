import { jsonReadResponse, withWalletRoute } from "@/lib/api-route";
import { listWalletsForMember } from "@/lib/wallet";

export async function GET(request: Request) {
  return withWalletRoute(async (result) => {
    const wallets = await listWalletsForMember(
      result.session.user.id,
      result.wallet.id,
    );
    return jsonReadResponse(request, wallets);
  });
}
