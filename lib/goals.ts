import { Prisma } from "@prisma/client";
import { cacheLife, cacheTag } from "next/cache";

import { CACHE_RESOURCE, walletTag } from "@/lib/cache";
import {
  actorFor,
  assertCallerCanManage,
  type Actor,
  type Caller,
} from "@/lib/caller";
import { DomainError } from "@/lib/errors";
import { notifyMembers } from "@/lib/notifications";
import prisma from "@/lib/prisma";
import { publishWalletChange } from "@/lib/realtime";
import { DeleteIdSchema } from "@/schemas/delete";
import {
  CreateGoalSchema,
  type UpdateGoalSchemaType,
  UpdateGoalSchema,
} from "@/schemas/goals";

export async function getGoalsWithProgress(walletId: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(walletTag(walletId, CACHE_RESOURCE.goals));

  const [goals, contributionSums] = await Promise.all([
    prisma.goal.findMany({
      where: {
        walletId,
      },
      select: {
        id: true,
        name: true,
        target: true,
        deadline: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),
    prisma.transaction.groupBy({
      by: ["goalId"],
      where: {
        walletId,
        goalId: {
          not: null,
        },
      },
      _sum: {
        amount: true,
      },
    }),
  ]);

  const contributedByGoalId = new Map(
    contributionSums.map((row) => [
      row.goalId,
      row._sum.amount ?? new Prisma.Decimal(0),
    ]),
  );

  return goals.map((goal) => ({
    ...goal,
    target: goal.target.toNumber(),
    contributed: contributedByGoalId.get(goal.id)?.toNumber() ?? 0,
  }));
}

export type GoalWithProgress = Awaited<
  ReturnType<typeof getGoalsWithProgress>
>[number];

export async function updateWalletGoal(
  caller: Caller,
  input: UpdateGoalSchemaType,
) {
  assertCallerCanManage(caller);
  const parsed = UpdateGoalSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError(parsed.error.issues[0]?.message ?? "Invalid goal");
  }

  const { id, name, target, deadline } = parsed.data;

  const data: Prisma.GoalUpdateInput = {};
  if (name !== undefined) {
    data.name = name;
  }
  if (target !== undefined) {
    data.target = target;
  }
  if (deadline !== undefined) {
    data.deadline = deadline;
  }
  if (Object.keys(data).length === 0) {
    throw new DomainError("Nothing to update");
  }

  const goal = await prisma.goal.update({
    where: {
      id,
      walletId: caller.walletId,
    },
    data,
  });

  await publishWalletChange({
    walletId: caller.walletId,
    actor: actorFor(caller),
    resource: "goals",
    message: `changed the ${goal.name} goal`,
  });

  return { ...goal, target: goal.target.toNumber() };
}

export type CreateGoalInput = {
  name: string;
  target: number;
  deadline?: Date;
};

export async function createWalletGoal(caller: Caller, input: CreateGoalInput) {
  assertCallerCanManage(caller);
  const parsed = CreateGoalSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError(parsed.error.issues[0]?.message ?? "Invalid goal");
  }

  const { name, target, deadline } = parsed.data;

  const goal = await prisma.goal.create({
    data: {
      walletId: caller.walletId,
      name,
      target,
      deadline: deadline ?? null,
    },
  });

  await publishWalletChange({
    walletId: caller.walletId,
    actor: actorFor(caller),
    resource: "goals",
    message: `added the ${goal.name} goal`,
  });

  return { ...goal, target: goal.target.toNumber() };
}

export async function notifyIfGoalReached(input: {
  actor: Actor;
  walletId: string;
  goal: { id: string; name: string; target: Prisma.Decimal };
  amount: number;
  formatAmount: (amount: number) => string;
}) {
  const { actor, walletId, goal, amount, formatAmount } = input;
  const contributed = await prisma.transaction.aggregate({
    where: {
      walletId,
      goalId: goal.id,
    },
    _sum: {
      amount: true,
    },
  });
  const total = contributed._sum.amount ?? new Prisma.Decimal(0);
  if (total.minus(amount).gte(goal.target) || total.lt(goal.target)) {
    return;
  }

  const members = await prisma.walletMembership.findMany({
    where: {
      walletId,
      leftAt: null,
    },
    select: {
      userId: true,
    },
  });
  await notifyMembers(
    actor,
    walletId,
    members.map((member) => member.userId),
    "goal_reached",
    `${goal.name} reached its target: ${formatAmount(total.toNumber())} of ${formatAmount(goal.target.toNumber())}.`,
  );
}

export async function deleteWalletGoal(caller: Caller, id: string) {
  assertCallerCanManage(caller);

  const parsedId = DeleteIdSchema.safeParse({ id });
  if (!parsedId.success) {
    throw new DomainError(
      parsedId.error.issues[0]?.message ?? "Goal not found",
    );
  }

  const goal = await prisma.goal.findFirst({
    where: {
      id,
      walletId: caller.walletId,
    },
  });
  if (!goal) {
    throw new DomainError("Goal not found");
  }

  const deleted = await prisma.goal.deleteMany({
    where: {
      id,
      walletId: caller.walletId,
    },
  });
  if (deleted.count === 0) {
    throw new DomainError("Goal not found");
  }

  await publishWalletChange({
    walletId: caller.walletId,
    actor: actorFor(caller),
    resource: "goals",
    message: `removed the ${goal.name} goal`,
  });

  return { ...goal, target: goal.target.toNumber() };
}
