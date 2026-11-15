"use server";

import type { RecordSettlementSchemaType } from "@/schemas/settlement";

import { redirect } from "next/navigation";

import { ok, fail } from "@/lib/action-result";
import { DomainError } from "@/lib/errors";
import { requireHousehold } from "@/lib/household";
import { firstIssueMessage } from "@/lib/issue-message";
import { withRequestId } from "@/lib/request-id";
import { recordSettlement } from "@/lib/settlements";

export async function RecordSettlement(form: RecordSettlementSchemaType) {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  const { session, household } = result;
  const { memberId, amount } = form;

  try {
    await withRequestId(async () => {
      await recordSettlement(
        household.id,
        session.user.id,
        { memberId, amount },
        result.membership.role,
      );
    });
  } catch (cause) {
    if (cause instanceof DomainError) {
      return fail(
        firstIssueMessage(
          cause.message,
          "Unable to record the settlement. Select the member and enter a valid amount, then try again.",
        ),
      );
    }
    throw cause;
  }
  return ok();
}
