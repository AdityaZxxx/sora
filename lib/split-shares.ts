export type ShareDraft = { userId: string; amount: number };

export type SplitMember = { user: { id: string } };

export type SplitMode = "equal" | "amounts" | "percent";

export type SharePlan = {
  shares: ShareDraft[];
  matchesAmount: boolean;
};

function parseAmountInput(raw: string | undefined) {
  const parsed = Number.parseFloat((raw ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function toCents(amount: number) {
  return Math.round(amount * 100);
}

function fromCents(cents: number) {
  return cents / 100;
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

  const rounded = members.map((member) => {
    const raw = parseAmountInput(inputs[member.user.id]);
    return {
      userId: member.user.id,
      amount: fromCents(
        toCents(mode === "percent" ? (amount * raw) / 100 : raw),
      ),
    };
  });

  const remainder =
    toCents(amount) -
    rounded.reduce((sum, share) => sum + toCents(share.amount), 0);
  if (remainder !== 0 && rounded.length > 0) {
    const largest = rounded.reduce((a, b) => (b.amount > a.amount ? b : a));
    largest.amount = fromCents(toCents(largest.amount) + remainder);
  }

  const shares = rounded.filter((share) => share.amount > 0);
  const totalCents = shares.reduce(
    (sum, share) => sum + toCents(share.amount),
    0,
  );
  return { shares, matchesAmount: totalCents === toCents(amount) };
}
