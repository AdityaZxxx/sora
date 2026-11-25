import { jsonReadResponse, withWalletRoute } from "@/lib/api-route";
import { getMonthlyRollup } from "@/lib/insights";

export async function GET(request: Request) {
  return withWalletRoute(async (result) => {
    const months = await getMonthlyRollup(result.wallet.id);
    return jsonReadResponse(request, months);
  });
}

export type GetInsightsResponseType = Awaited<
  ReturnType<typeof getMonthlyRollup>
>;
