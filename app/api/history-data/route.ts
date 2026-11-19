import { z } from "zod";

import { parseQueryParams, withHouseholdRoute } from "@/lib/api-route";
import { getHistoryData } from "@/lib/history";

const getHistoryDataSchema = z.object({
  timeframe: z.enum(["month", "year"]),
  month: z.coerce.number().min(0).max(11).default(0),
  year: z.coerce.number().min(2000).max(3000),
});

export async function GET(request: Request) {
  return withHouseholdRoute(async (result) => {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get("timeframe");
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    const queryParams = parseQueryParams(getHistoryDataSchema, {
      timeframe,
      month,
      year,
    });

    const data = await getHistoryData(
      result.household.id,
      queryParams.timeframe,
      {
        month: queryParams.month,
        year: queryParams.year,
      },
    );

    return Response.json(data);
  });
}

export type { GetHistoryDataResponseType } from "@/lib/history";
