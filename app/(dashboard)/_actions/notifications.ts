"use server";

import type { Notification } from "@prisma/client";

import { withHouseholdAction } from "@/lib/action-result";
import prisma from "@/lib/prisma";

export async function listNotifications() {
  return withHouseholdAction(
    "Unable to load the notifications. Refresh the page and try again.",
    ({ household, session }) =>
      prisma.notification.findMany({
        where: {
          householdId: household.id,
          userId: session.user.id,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 50,
      }),
  );
}

export type NotificationItem = Notification;

export async function markAllRead() {
  return withHouseholdAction(
    "Unable to mark the notifications as read. Refresh the page and try again.",
    async ({ household, session }) => {
      await prisma.notification.updateMany({
        where: {
          householdId: household.id,
          userId: session.user.id,
          readAt: null,
        },
        data: {
          readAt: new Date(),
        },
      });
    },
  );
}
