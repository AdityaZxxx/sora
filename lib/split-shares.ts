import { Prisma } from "@prisma/client";

import { sumMoney, toMoney, zeroMoney, type Money } from "@/lib/money";

export type ShareDraft = { userId: string; amount: number };

export type SplitMember = { user: { id: string } };

export type SplitMode = "equal" | "amounts" | "percent";

function parseAmountInput(raw: string | undefined): Money {
  const text = (raw ?? "").replace(",", ".").trim();
  if (!text) return zeroMoney();
  try {
    const parsed = toMoney(text);
    return parsed.isFinite() ? parsed : zeroMoney();
  } catch {
    return zeroMoney();
  }
}

export function finalizeShares(
  mode: "amounts" | "percent",
  inputs: Record<string, string>,
  members: SplitMember[],
  amount: number,
): ShareDraft[] {
  const total = toMoney(amount);
  const rounded = members.map((member) => {
    const raw = parseAmountInput(inputs[member.user.id]);
    const share = mode === "percent" ? raw.times(total).div(100) : raw;
    return {
      userId: member.user.id,
      amount: share.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).toNumber(),
    };
  });

  const remainder = total.minus(
    sumMoney(rounded.map((share) => toMoney(share.amount))),
  );
  if (!remainder.isZero() && rounded.length > 0) {
    const largest = rounded.reduce((a, b) => (b.amount > a.amount ? b : a));
    largest.amount = toMoney(largest.amount).plus(remainder).toNumber();
  }

  return rounded.filter((share) => share.amount > 0);
}

export function sharesTotal(shares: ShareDraft[]): Money {
  return sumMoney(shares.map((share) => toMoney(share.amount)));
}

export function sharesMatchExpense(shares: ShareDraft[], amount: number) {
  return shares.length === 0 || sharesTotal(shares).eq(amount);
}
