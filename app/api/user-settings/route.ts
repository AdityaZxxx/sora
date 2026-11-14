import { NextResponse } from "next/server";

import { unauthorized } from "@/lib/errors";
import { requireHousehold } from "@/lib/household";

export async function GET() {
  const result = await requireHousehold();

  if (!result) {
    return unauthorized();
  }

  return NextResponse.json(result.household);
}
