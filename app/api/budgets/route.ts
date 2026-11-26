import { jsonReadResponse, withWalletRoute } from "@/lib/api-route";
import { getBudgetsWithProgress } from "@/lib/budgets";

export async function GET(request: Request) {
  return withWalletRoute(async (result) => {
    const budgets = await getBudgetsWithProgress(result.wallet.id);
    return jsonReadResponse(request, budgets);
  });
}
