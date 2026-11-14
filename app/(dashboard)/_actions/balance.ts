"use server";

import type { RecordSettlementSchemaType } from "@/schemas/settlement";

import { redirect } from "next/navigation";

import { requireHousehold } from "@/lib/household";
import { withRequestId } from "@/lib/request-id";
import { recordSettlement } from "@/lib/settlements";
import { RecordSettlementSchema } from "@/schemas/settlement";

export async function RecordSettlement(form: RecordSettlementSchemaType) {
  const parsedBody = RecordSettlementSchema.safeParse(form);
  if (!parsedBody.success) {
    throw new Error("Bad request");
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  const { session, household } = result;
  const { memberId, amount } = parsedBody.data;

  await withRequestId(async () => {
    await recordSettlement(
      household.id,
      session.user.id,
      { memberId, amount },
      result.membership.role,
    );
  });
}
