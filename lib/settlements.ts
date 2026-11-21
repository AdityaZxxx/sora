import { after } from "next/server";

import { actorFor, assertCallerFullMember, type Caller } from "@/lib/caller";
import { categoryIconSnapshot } from "@/lib/category-icons";
import { DEFAULT_CURRENCY } from "@/lib/constants";
import { DomainError } from "@/lib/errors";
import { getFormatterForCurrency } from "@/lib/helpers";
import { log } from "@/lib/log";
import { notify } from "@/lib/notifications";
import prisma from "@/lib/prisma";
import { publishHouseholdChange } from "@/lib/realtime";
import { RecordSettlementSchema } from "@/schemas/settlement";

const SETTLEMENT_CATEGORY_NAME = "Settlement";
const SETTLEMENT_CATEGORY_ICON = "🤝";
const SETTLEMENT_DESCRIPTION_PREFIX = "Settlement with ";

export function isSettlementCategory(name: string) {
  return name === SETTLEMENT_CATEGORY_NAME;
}

export function settlementCategoryEquals() {
  return { equals: SETTLEMENT_CATEGORY_NAME };
}

export function settlementCategoryExclusion() {
  return { not: SETTLEMENT_CATEGORY_NAME };
}

export type RecordSettlementInput = {
  memberId: string;
  amount: number;
  addedVia?: "agent" | null;
};

export async function recordSettlement(
  caller: Caller,
  input: RecordSettlementInput,
) {
  const startedAt = Date.now();
  try {
    return await runSettlement(caller, input, startedAt);
  } catch (cause) {
    if (cause instanceof DomainError) {
      log("warn", "settlement.recorded", {
        householdId: caller.householdId,
        userId: caller.userId,
        outcome: "rejected",
        durationMs: Date.now() - startedAt,
      });
    } else {
      log("error", "settlement.recorded", {
        householdId: caller.householdId,
        userId: caller.userId,
        outcome: "failed",
        durationMs: Date.now() - startedAt,
      });
    }
    throw cause;
  }
}

async function runSettlement(
  caller: Caller,
  input: RecordSettlementInput,
  startedAt: number,
) {
  assertCallerFullMember(caller);
  const { householdId, userId } = caller;
  const parsedBody = RecordSettlementSchema.safeParse({
    memberId: input.memberId,
    amount: input.amount,
  });
  if (!parsedBody.success) {
    throw new DomainError(
      parsedBody.error.issues[0]?.message ?? "Invalid settlement input",
    );
  }

  const { memberId, amount } = parsedBody.data;

  if (memberId === userId) {
    throw new DomainError("Cannot record a settlement with yourself");
  }

  const [membership, household] = await Promise.all([
    prisma.householdMembership.findUnique({
      where: {
        householdId_userId: {
          householdId,
          userId: memberId,
        },
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.household.findUnique({
      where: {
        id: householdId,
      },
      select: {
        currency: true,
      },
    }),
  ]);

  if (!membership) {
    throw new DomainError("Member not found");
  }

  const amountText = getFormatterForCurrency(
    household?.currency ?? DEFAULT_CURRENCY,
  ).format(amount);
  const payerName = caller.actorName;

  const settlement = await prisma.$transaction(async (tx) => {
    const category = await tx.category.upsert({
      where: {
        name_householdId_type: {
          householdId,
          name: SETTLEMENT_CATEGORY_NAME,
          type: "expense",
        },
      },
      create: {
        householdId,
        name: SETTLEMENT_CATEGORY_NAME,
        icon: SETTLEMENT_CATEGORY_ICON,
        iconKind: "emoji",
        iconColor: null,
        type: "expense",
      },
      update: {},
    });

    const created = await tx.transaction.create({
      data: {
        householdId,
        addedById: userId,
        counterpartyId: memberId,
        amount,
        date: new Date(),
        description: `${SETTLEMENT_DESCRIPTION_PREFIX}${membership.user.name}`,
        type: "expense",
        shared: false,
        category: category.name,
        ...categoryIconSnapshot(category),
        addedVia: input.addedVia ?? null,
      },
    });

    await publishHouseholdChange({
      householdId,
      actor: actorFor(caller),
      resource: "transactions",
      message: `recorded a settlement of ${amountText} with ${membership.user.name}`,
      executor: tx,
    });

    return created;
  });

  log("info", "settlement.recorded", {
    householdId,
    userId,
    outcome: "ok",
    durationMs: Date.now() - startedAt,
  });

  after(async () => {
    const otherMembers = await prisma.householdMembership.findMany({
      where: {
        householdId,
        userId: {
          not: userId,
        },
      },
      select: {
        userId: true,
      },
    });

    await Promise.all(
      otherMembers.map((other) =>
        notify(
          actorFor(caller),
          householdId,
          other.userId,
          "settlement",
          other.userId === memberId
            ? `${payerName} recorded a settlement of ${amountText} with you.`
            : `${payerName} recorded a settlement of ${amountText} with ${membership.user.name}.`,
        ),
      ),
    );
  });

  return settlement;
}
