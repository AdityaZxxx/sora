import type { Actor } from "@/lib/caller";
import type { TransactionType } from "@/lib/types";
import type { Prisma } from "@prisma/client";

import { notifyIfGoalReached } from "@/lib/goals";
import { toMoney } from "@/lib/money";
import { notifyWalletExcept, notifyMembers } from "@/lib/notifications";
import prisma from "@/lib/prisma";
import { evaluateUnusualSpending } from "@/lib/unusual-spending";

export type PostCommitEffect = () => Promise<void>;

export type PostCommitInput = {
  actor: Actor;
  walletId: string;
  userId: string;
  actorName: string;
  categoryName: string;
  amount: number;
  description: string;
  type: TransactionType;
  formattedAmount: string;
  formatAmount: (amount: number) => string;
  thresholdMessage: string | null;
  goal: { id: string; name: string; target: Prisma.Decimal } | null;
};

export function buildPostCommitEffects(
  input: PostCommitInput,
): PostCommitEffect[] {
  const {
    actor,
    walletId,
    userId,
    actorName,
    categoryName,
    amount,
    description,
    type,
    formattedAmount,
    formatAmount,
    thresholdMessage,
    goal,
  } = input;

  const effects: PostCommitEffect[] = [];

  if (thresholdMessage) {
    effects.push(async () => {
      await notifyWalletExcept(
        actor,
        walletId,
        userId,
        "budget_threshold",
        thresholdMessage,
      );
    });
  }

  const message = `${actorName} added a ${type} of ${formattedAmount} (${description || categoryName}).`;
  effects.push(async () => {
    await notifyWalletExcept(actor, walletId, userId, "transaction", message);
  });

  if (goal) {
    effects.push(() =>
      notifyIfGoalReached({
        actor,
        walletId,
        goal,
        amount,
        formatAmount,
      }),
    );
  }

  effects.push(async () => {
    await evaluateUnusualSpending(
      {
        amount: toMoney(amount),
        category: categoryName,
        description,
        type,
        walletId,
        userId,
      },
      {
        actor,
        clock: () => new Date(),
        repo: prisma,
        notifier: notifyMembers,
      },
    );
  });

  return effects;
}
