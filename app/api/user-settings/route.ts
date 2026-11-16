import { NextResponse } from "next/server";

import { withHouseholdRoute } from "@/lib/api-route";

export async function GET() {
  return withHouseholdRoute(async (result) => {
    return NextResponse.json(result.household);
  });
}
