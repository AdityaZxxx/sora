import type { NextRequest } from "next/server";

import {
  dateRangeFromParams,
  jsonReadResponse,
  withHouseholdRoute,
} from "@/lib/api-route";
import {
  TRANSACTION_HISTORY_MAX_PAGE_SIZE,
  TRANSACTION_HISTORY_PAGE_SIZE,
} from "@/lib/constants";
import { getTransactionsHistory } from "@/lib/transactions";

export async function GET(request: NextRequest) {
  return withHouseholdRoute(async (result) => {
    const { searchParams } = new URL(request.url);
    const range = dateRangeFromParams(searchParams);

    const requestedLimit = Number(
      searchParams.get("limit") ?? TRANSACTION_HISTORY_PAGE_SIZE,
    );
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(
          Math.max(Math.trunc(requestedLimit), 1),
          TRANSACTION_HISTORY_MAX_PAGE_SIZE,
        )
      : TRANSACTION_HISTORY_PAGE_SIZE;

    const page = await getTransactionsHistory(
      result.household.id,
      result.session.user.id,
      range.from,
      range.to,
      {
        cursor: searchParams.get("cursor"),
        limit,
      },
    );

    return jsonReadResponse(request, page);
  });
}
