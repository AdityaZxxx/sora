import { jsonReadResponse, withWalletRoute } from "@/lib/api-route";
import { listSettlements } from "@/lib/settlements";

export async function GET(request: Request) {
  return withWalletRoute(async (result) => {
    const settlements = await listSettlements(
      result.wallet.id,
      result.caller.userId,
    );
    return jsonReadResponse(request, settlements);
  });
}
