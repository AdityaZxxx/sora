import { Prisma } from "@prisma/client";

import { sumMoney, toMoney, zeroMoney, type Money } from "@/lib/money";

export type ShareDraft = { userId: string; amount: string };

export type SplitMember = { user: { id: string } };

export type SplitMode = "equal" | "amounts" | "percent";

export type SharePlan = {
  shares: ShareDraft[];
  matchesAmount: boolean;
};

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

export function buildShares(
  mode: SplitMode,
  inputs: Record<string, string>,
  members: SplitMember[],
  amount: number,
): SharePlan {
  if (mode === "equal") {
    return { shares: [], matchesAmount: true };
  }

  const total = toMoney(amount);
  const rounded = members.map((member) => {
    const raw = parseAmountInput(inputs[member.user.id]);
    const share = mode === "percent" ? raw.times(total).div(100) : raw;
    return {
      userId: member.user.id,
      amount: share.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).toFixed(2),
    };
  });

  const remainder = total.minus(
    sumMoney(rounded.map((share) => toMoney(share.amount))),
  );
  if (!remainder.isZero() && rounded.length > 0) {
    const largest = rounded.reduce((a, b) =>
      toMoney(b.amount).gt(toMoney(a.amount)) ? b : a,
    );
    largest.amount = toMoney(largest.amount).plus(remainder).toFixed(2);
  }

  const shares = rounded.filter((share) => toMoney(share.amount).gt(0));
  return { shares, matchesAmount: sharesTotal(shares).eq(total) };
}

type ShareAmount = { userId: string; amount: number | string };

export function sharesTotal(shares: readonly ShareAmount[]): Money {
  return sumMoney(shares.map((share) => toMoney(share.amount)));
}

export function sharesMatchExpense(
  shares: readonly ShareAmount[],
  amount: number,
) {
  return shares.length === 0 || sharesTotal(shares).eq(amount);
}
