import {
  dateRangeFromParams,
  jsonReadResponse,
  withWalletRoute,
} from "@/lib/api-route";
import { getCategoriesStats } from "@/lib/transactions";

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  return withWalletRoute(async (result) => {
    const range = dateRangeFromParams(searchParams);

    const stats = await getCategoriesStats(
      result.wallet.id,
      range.from,
      range.to,
    );
    return jsonReadResponse(request, stats);
  });
}
