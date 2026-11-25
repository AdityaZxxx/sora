import type { Actor } from "@/lib/caller";
import type { Notification } from "@prisma/client";

import { cacheLife, cacheTag } from "next/cache";

import { CACHE_RESOURCE, walletTag } from "@/lib/cache";
import prisma from "@/lib/prisma";
import { publishWalletChange } from "@/lib/realtime";

// seam-parse-exempt: only server-resolved, validated values reach these helpers.
export async function notify(
  actor: Actor,
  walletId: string,
  userId: string,
  type: string,
  message: string,
) {
  await prisma.notification.create({
    data: {
      walletId,
      userId,
      type,
      message,
    },
  });

  await publishWalletChange({
    walletId,
    actor,
    resource: "notifications",
    message: "has a new notification",
  });
}

// seam-parse-exempt: only server-resolved, validated values reach these helpers.
export async function notifyMembers(
  actor: Actor,
  walletId: string,
  userIds: string[],
  type: string,
  message: string,
) {
  if (userIds.length === 0) return;
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      walletId,
      userId,
      type,
      message,
    })),
  });

  await publishWalletChange({
    walletId,
    actor,
    resource: "notifications",
    message: "has a new notification",
  });
}

export async function listNotifications(
  walletId: string,
  userId: string,
): Promise<Notification[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(walletTag(walletId, CACHE_RESOURCE.notifications));

  return await prisma.notification.findMany({
    where: {
      walletId,
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });
}

// seam-parse-exempt: inputs are session values, never user input.
export async function markNotificationsRead(walletId: string, userId: string) {
  await prisma.notification.updateMany({
    where: {
      walletId,
      userId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });
}

export async function notifyWalletExcept(
  actor: Actor,
  walletId: string,
  exceptUserId: string,
  type: string,
  message: string,
) {
  const memberships = await prisma.walletMembership.findMany({
    where: {
      walletId,
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
    walletId,
    memberships.map((membership) => membership.userId),
    type,
    message,
  );
}
