import type { NextRequest } from "next/server";

import {
  dateRangeFromParams,
  jsonReadResponse,
  withHouseholdRoute,
} from "@/lib/api-route";
import { getTransactionsHistory } from "@/lib/transactions";

export async function GET(request: NextRequest) {
  return withHouseholdRoute(async (result) => {
    const { searchParams } = new URL(request.url);

    const range = dateRangeFromParams(searchParams);

    const transactions = await getTransactionsHistory(
      result.household.id,
      result.session.user.id,
      range.from,
      range.to,
    );

    return jsonReadResponse(request, transactions);
  });
}
