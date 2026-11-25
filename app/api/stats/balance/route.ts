import {
  dateRangeFromParams,
  jsonReadResponse,
  withWalletRoute,
} from "@/lib/api-route";
import { getBalanceStats } from "@/lib/transactions";

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  return withWalletRoute(async (result) => {
    const range = dateRangeFromParams(searchParams);

    const stats = await getBalanceStats(result.wallet.id, range.from, range.to);

    return jsonReadResponse(request, stats);
  });
}
