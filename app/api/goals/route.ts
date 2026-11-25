import { jsonReadResponse, withWalletRoute } from "@/lib/api-route";
import { getGoalsWithProgress } from "@/lib/goals";

export async function GET(request: Request) {
  return withWalletRoute(async (result) => {
    const goals = await getGoalsWithProgress(result.wallet.id);
    return jsonReadResponse(request, goals);
  });
}
