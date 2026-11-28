import { cacheLife, cacheTag } from "next/cache";
import { after } from "next/server";

import { CACHE_RESOURCE, walletTag } from "@/lib/cache";
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
  direction?: "paid" | "received";
  date?: Date;
  note?: string | null;
  addedVia?: "agent" | null;
};

export type SettlementRow = {
  id: string;
  date: Date;
  amount: number | null;
  note: string | null;
  payerName: string | null;
  receiverName: string | null;
  isParty: boolean;
  isPayer: boolean;
};

export async function listSettlements(
  walletId: string,
  callerId: string,
): Promise<SettlementRow[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(walletTag(walletId, CACHE_RESOURCE.settlements));

  const settlements = await prisma.settlement.findMany({
    where: { walletId },
    include: {
      payer: { select: { name: true } },
      receiver: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  });

  return settlements.map((settlement) => {
    const isParty =
      settlement.payerId === callerId || settlement.receiverId === callerId;
    return {
      id: settlement.id,
      date: settlement.date,
      amount: isParty ? settlement.amount.toNumber() : null,
      note: isParty ? settlement.note : null,
      payerName: isParty ? settlement.payer.name : null,
      receiverName: isParty ? settlement.receiver.name : null,
      isParty,
      isPayer: settlement.payerId === callerId,
    };
  });
}

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
    direction: input.direction ?? "paid",
    date: input.date,
    note: input.note ?? undefined,
  });
  if (!parsedBody.success) {
    throw new DomainError(
      parsedBody.error.issues[0]?.message ?? "Invalid settlement input",
    );
  }

  const { memberId, amount, direction, date, note } = parsedBody.data;
  if (memberId === userId) {
    throw new DomainError("Cannot record a settlement with yourself");
  }

  const payerId = direction === "paid" ? userId : memberId;
  const receiverId = direction === "paid" ? memberId : userId;

  const [membership, wallet] = await Promise.all([
    prisma.walletMembership.findUnique({
      where: {
        walletId_userId: {
          walletId,
          userId: memberId,
        },
        leftAt: null,
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

  if (!membership || membership.leftAt) {
    throw new DomainError("Member not found");
  }

  const formatAmount = getFormatterForCurrency(
    wallet?.currency ?? DEFAULT_CURRENCY,
  ).format;
  const amountText = formatAmount(amount);

  const settlement = await prisma.$transaction(async (tx) => {
    return await tx.settlement.create({
      data: {
        walletId,
        payerId,
        receiverId,
        amount,
        date: date ?? new Date(),
        note: note ?? null,
        addedVia: input.addedVia ?? null,
      },
    });
  });

  await publishWalletChange({
    walletId,
    actor: actorFor(caller),
    resource: "settlements",
    message: "recorded a settlement",
  });

  log("info", "settlement.recorded", {
    walletId,
    userId,
    outcome: "ok",
    durationMs: Date.now() - startedAt,
  });

  after(async () => {
    const actor = actorFor(caller);
    const otherName = membership.user.name;
    await Promise.all([
      notify(
        actor,
        walletId,
        payerId,
        "settlement",
        payerId === userId
          ? `You recorded a settlement of ${amountText} with ${otherName}.`
          : `${caller.actorName} recorded a settlement of ${amountText} with you.`,
      ),
      notify(
        actor,
        walletId,
        receiverId,
        "settlement",
        receiverId === userId
          ? `You recorded a settlement of ${amountText} with ${otherName}.`
          : `${caller.actorName} recorded a settlement of ${amountText} with you.`,
      ),
    ]);
  });

  return settlement;
}
