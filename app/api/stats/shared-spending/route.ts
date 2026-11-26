import { jsonReadResponse, withWalletRoute } from "@/lib/api-route";
import { getSharedSpending } from "@/lib/budgets";

export async function GET(request: Request) {
  return withWalletRoute(async (result) => {
    const stats = await getSharedSpending(result.wallet.id);

    return jsonReadResponse(request, stats);
  });
}

export type { GetSharedSpendingResponseType } from "@/lib/budgets";
