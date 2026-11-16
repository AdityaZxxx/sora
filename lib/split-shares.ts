export type ShareDraft = { userId: string; amount: number };

export type SplitMember = { user: { id: string } };

export type SplitMode = "equal" | "amounts" | "percent";

function parseAmountInput(raw: string | undefined) {
  const parsed = Number.parseFloat((raw ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function toCents(amount: number) {
  return Math.round(amount * 100);
}

export function fromCents(cents: number) {
  return cents / 100;
}

export function finalizeShares(
  mode: "amounts" | "percent",
  inputs: Record<string, string>,
  members: SplitMember[],
  amount: number,
): ShareDraft[] {
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

  return rounded.filter((share) => share.amount > 0);
}

export function sharesTotalCents(shares: ShareDraft[]) {
  return shares.reduce((sum, share) => sum + toCents(share.amount), 0);
}

export function sharesMatchExpense(shares: ShareDraft[], amount: number) {
  return shares.length === 0 || sharesTotalCents(shares) === toCents(amount);
}
