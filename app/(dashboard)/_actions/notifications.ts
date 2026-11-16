"use server";

import type { Notification } from "@prisma/client";

import { withHouseholdAction } from "@/lib/action-result";
import {
  listNotifications as listNotificationsSeam,
  markNotificationsRead,
} from "@/lib/notifications";

export async function listNotifications() {
  return withHouseholdAction(
    "Unable to load the notifications. Refresh the page and try again.",
    ({ household, session }) =>
      listNotificationsSeam(household.id, session.user.id),
  );
}

export type NotificationItem = Notification;

export async function markAllRead() {
  return withHouseholdAction(
    "Unable to mark the notifications as read. Refresh the page and try again.",
    async ({ household, session }) => {
      await markNotificationsRead(household.id, session.user.id);
    },
  );
}
