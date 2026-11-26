import { after } from "next/server";

import { actorFor, assertCallerCanWrite, type Caller } from "@/lib/caller";
import { DEFAULT_CURRENCY } from "@/lib/constants";
import { DomainError } from "@/lib/errors";
import { getFormatterForCurrency } from "@/lib/helpers";
import { log } from "@/lib/log";
import { notify } from "@/lib/notifications";
import prisma from "@/lib/prisma";
import { publishWalletChange } from "@/lib/realtime";
import { RecordSettlementSchema } from "@/schemas/settlement";

export type RecordSettlementInput = {
  memberId: string;
  amount: number;
  date?: Date;
  note?: string | null;
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
    const outcome = cause instanceof DomainError ? "rejected" : "failed";
    log(outcome === "rejected" ? "warn" : "error", "settlement.recorded", {
      walletId: caller.walletId,
      userId: caller.userId,
      outcome,
      durationMs: Date.now() - startedAt,
    });
    throw cause;
  }
}

async function runSettlement(
  caller: Caller,
  input: RecordSettlementInput,
  startedAt: number,
) {
  assertCallerCanWrite(caller);
  const { walletId, userId } = caller;
  const parsedBody = RecordSettlementSchema.safeParse({
    memberId: input.memberId,
    amount: input.amount,
    date: input.date,
    note: input.note ?? undefined,
  });
  if (!parsedBody.success) {
    throw new DomainError(
      parsedBody.error.issues[0]?.message ?? "Invalid settlement input",
    );
  }

  const { memberId, amount, date, note } = parsedBody.data;
  if (memberId === userId) {
    throw new DomainError("Cannot record a settlement with yourself");
  }

  const [membership, wallet] = await Promise.all([
    prisma.walletMembership.findUnique({
      where: {
        walletId_userId: {
          walletId,
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
    prisma.wallet.findUnique({
      where: { id: walletId },
      select: { currency: true },
    }),
  ]);

  if (!membership) {
    throw new DomainError("Member not found");
  }

  const formatAmount = getFormatterForCurrency(
    wallet?.currency ?? DEFAULT_CURRENCY,
  ).format;
  const amountText = formatAmount(amount);
  const payerName = caller.actorName;

  const settlement = await prisma.$transaction(async (tx) => {
    const created = await tx.settlement.create({
      data: {
        walletId,
        payerId: userId,
        receiverId: memberId,
        amount,
        date: date ?? new Date(),
        note: note ?? null,
        addedVia: input.addedVia ?? null,
      },
    });

    await publishWalletChange({
      walletId,
      actor: actorFor(caller),
      resource: "settlements",
      message: `recorded a settlement of ${amountText} with ${membership.user.name}`,
      executor: tx,
    });

    return created;
  });

  log("info", "settlement.recorded", {
    walletId,
    userId,
    outcome: "ok",
    durationMs: Date.now() - startedAt,
  });

  after(async () => {
    const otherMembers = await prisma.walletMembership.findMany({
      where: {
        walletId,
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
          walletId,
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
