import type { Actor } from "@/lib/caller";
import type { Notification } from "@prisma/client";

import { cacheLife, cacheTag } from "next/cache";

import { CACHE_RESOURCE, householdTag } from "@/lib/cache";
import prisma from "@/lib/prisma";
import { publishHouseholdChange } from "@/lib/realtime";

// seam-parse-exempt: only server-resolved, validated values reach these helpers.
export async function notify(
  actor: Actor,
  householdId: string,
  userId: string,
  type: string,
  message: string,
) {
  await prisma.notification.create({
    data: {
      householdId,
      userId,
      type,
      message,
    },
  });

  await publishHouseholdChange({
    householdId,
    actor,
    resource: "notifications",
    message: "has a new notification",
  });
}

// seam-parse-exempt: only server-resolved, validated values reach these helpers.
export async function notifyMembers(
  actor: Actor,
  householdId: string,
  userIds: string[],
  type: string,
  message: string,
) {
  if (userIds.length === 0) return;
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      householdId,
      userId,
      type,
      message,
    })),
  });

  await publishHouseholdChange({
    householdId,
    actor,
    resource: "notifications",
    message: "has a new notification",
  });
}

export async function listNotifications(
  householdId: string,
  userId: string,
): Promise<Notification[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(householdTag(householdId, CACHE_RESOURCE.notifications));

  return await prisma.notification.findMany({
    where: {
      householdId,
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });
}

// seam-parse-exempt: inputs are session values, never user input.
export async function markNotificationsRead(
  householdId: string,
  userId: string,
) {
  await prisma.notification.updateMany({
    where: {
      householdId,
      userId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });
}

export async function notifyHouseholdExcept(
  actor: Actor,
  householdId: string,
  exceptUserId: string,
  type: string,
  message: string,
) {
  const memberships = await prisma.householdMembership.findMany({
    where: {
      householdId,
      userId: {
        not: exceptUserId,
      },
    },
    select: {
      userId: true,
    },
  });
  await notifyMembers(
    actor,
    householdId,
    memberships.map((membership) => membership.userId),
    type,
    message,
  );
}
