import { jsonReadResponse, withWalletRoute } from "@/lib/api-route";
import { listRecurringItems } from "@/lib/recurring";

export async function GET(request: Request) {
  return withWalletRoute(async (result) => {
    const items = await listRecurringItems(result.wallet.id);
    return jsonReadResponse(request, items);
  });
}
