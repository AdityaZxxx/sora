import type { TransactionType } from "@/lib/types";
import type { Prisma } from "@prisma/client";

import { CACHE_RESOURCE, revalidateHousehold } from "@/lib/cache";
import { notifyIfGoalReached } from "@/lib/goals";
import { toMoney } from "@/lib/money";
import { notifyHouseholdExcept } from "@/lib/notifications";
import { evaluateUnusualSpending } from "@/lib/unusual-spending";

export type PostCommitEffect = () => Promise<void>;

export type PostCommitInput = {
  householdId: string;
  userId: string;
  actorName: string;
  categoryName: string;
  amount: number;
  description: string;
  type: TransactionType;
  shared: boolean;
  formattedAmount: string;
  formatAmount: (amount: number) => string;
  thresholdMessage: string | null;
  goal: { id: string; name: string; target: Prisma.Decimal } | null;
};

export function buildPostCommitEffects(
  input: PostCommitInput,
): PostCommitEffect[] {
  const {
    householdId,
    userId,
    actorName,
    categoryName,
    amount,
    description,
    type,
    shared,
    formattedAmount,
    formatAmount,
    thresholdMessage,
    goal,
  } = input;

  const effects: PostCommitEffect[] = [];

  if (thresholdMessage) {
    effects.push(async () => {
      await notifyHouseholdExcept(
        householdId,
        userId,
        "budget_threshold",
        thresholdMessage,
      );
      revalidateHousehold(householdId, [CACHE_RESOURCE.notifications]);
    });
  }

  if (shared) {
    const message = `${actorName} added a shared ${type} of ${formattedAmount} (${description || categoryName}).`;
    effects.push(async () => {
      await notifyHouseholdExcept(householdId, userId, "transaction", message);
      revalidateHousehold(householdId, [CACHE_RESOURCE.notifications]);
    });
  }

  if (goal && shared) {
    effects.push(() =>
      notifyIfGoalReached({
        householdId,
        goal,
        amount,
        formatAmount,
      }),
    );
  }

  effects.push(async () => {
    const result = await evaluateUnusualSpending({
      amount: toMoney(amount),
      category: categoryName,
      description,
      type,
      shared,
      householdId,
      userId,
    });
    if (result.notified > 0) {
      revalidateHousehold(householdId, [CACHE_RESOURCE.notifications]);
    }
  });

  return effects;
}
