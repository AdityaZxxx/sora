import { jsonReadResponse, withWalletRoute } from "@/lib/api-route";
import { getSafeToSpend } from "@/lib/budgets";

export async function GET(request: Request): Promise<Response> {
  return withWalletRoute(async (result) => {
    const safeToSpend = await getSafeToSpend(result.wallet.id);
    return jsonReadResponse(request, safeToSpend);
  });
}
