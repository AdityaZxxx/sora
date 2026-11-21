import { Prisma } from "@prisma/client";
import { cacheLife, cacheTag } from "next/cache";

import { CACHE_RESOURCE, householdTag } from "@/lib/cache";
import { actorFor, assertCallerFullMember, type Caller } from "@/lib/caller";
import { DomainError } from "@/lib/errors";
import prisma from "@/lib/prisma";
import { publishHouseholdChange } from "@/lib/realtime";
import { DeleteIdSchema } from "@/schemas/delete";
import {
  CreateGoalSchema,
  type UpdateGoalSchemaType,
  UpdateGoalSchema,
} from "@/schemas/goals";

export async function getGoalsWithProgress(householdId: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(householdTag(householdId, CACHE_RESOURCE.goals));

  const [goals, contributionSums] = await Promise.all([
    prisma.goal.findMany({
      where: {
        householdId,
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
        householdId,
        goalId: {
          not: null,
        },
        shared: true,
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

export async function updateHouseholdGoal(
  caller: Caller,
  input: UpdateGoalSchemaType,
) {
  assertCallerFullMember(caller);
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
      householdId: caller.householdId,
    },
    data,
  });

  await publishHouseholdChange({
    householdId: caller.householdId,
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

export async function createHouseholdGoal(
  caller: Caller,
  input: CreateGoalInput,
) {
  assertCallerFullMember(caller);
  const parsed = CreateGoalSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError(parsed.error.issues[0]?.message ?? "Invalid goal");
  }

  const { name, target, deadline } = parsed.data;

  const goal = await prisma.goal.create({
    data: {
      householdId: caller.householdId,
      name,
      target,
      deadline: deadline ?? null,
    },
  });

  await publishHouseholdChange({
    householdId: caller.householdId,
    actor: actorFor(caller),
    resource: "goals",
    message: `added the ${goal.name} goal`,
  });

  return { ...goal, target: goal.target.toNumber() };
}

export async function deleteHouseholdGoal(caller: Caller, id: string) {
  assertCallerFullMember(caller);

  const parsedId = DeleteIdSchema.safeParse({ id });
  if (!parsedId.success) {
    throw new DomainError(
      parsedId.error.issues[0]?.message ?? "Goal not found",
    );
  }

  const goal = await prisma.goal.findFirst({
    where: {
      id,
      householdId: caller.householdId,
    },
  });
  if (!goal) {
    throw new DomainError("Goal not found");
  }

  const deleted = await prisma.goal.deleteMany({
    where: {
      id,
      householdId: caller.householdId,
    },
  });
  if (deleted.count === 0) {
    throw new DomainError("Goal not found");
  }

  await publishHouseholdChange({
    householdId: caller.householdId,
    actor: actorFor(caller),
    resource: "goals",
    message: `removed the ${goal.name} goal`,
  });

  return { ...goal, target: goal.target.toNumber() };
}
