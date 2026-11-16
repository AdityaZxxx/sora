import { type NextRequest, NextResponse } from "next/server";

import { rejection } from "@/lib/api-route";
import { sendEmail } from "@/lib/email";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return rejection("Unauthorized", 401);
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const memberships = await prisma.householdMembership.findMany({
    where: {
      emailDigest: true,
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  const notifications = await prisma.notification.findMany({
    where: {
      OR: memberships.map((m) => ({
        householdId: m.householdId,
        userId: m.userId,
      })),
      createdAt: {
        gte: since,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const notificationsByMember = new Map<string, typeof notifications>();
  for (const notification of notifications) {
    const key = `${notification.householdId}:${notification.userId}`;
    const memberNotifications = notificationsByMember.get(key);
    if (memberNotifications) {
      memberNotifications.push(notification);
    } else {
      notificationsByMember.set(key, [notification]);
    }
  }

  let sent = 0;

  for (const membership of memberships) {
    const memberNotifications =
      notificationsByMember.get(
        `${membership.householdId}:${membership.userId}`,
      ) ?? [];

    if (memberNotifications.length === 0) continue;

    const items = memberNotifications.map(
      (notification) => `<li>${escapeHtml(notification.message)}</li>`,
    );

    // Emails go out one at a time so the free provider tier is never hit
    // with a burst.
    // oxlint-disable-next-line eslint/no-await-in-loop
    await sendEmail({
      to: membership.user.email,
      subject: `Your Sora digest: ${memberNotifications.length} new ${
        memberNotifications.length === 1 ? "notification" : "notifications"
      }`,
      text: `Hi ${membership.user.name}, here are your notifications from the last 24 hours:\n\n${memberNotifications
        .map((notification) => `- ${notification.message}`)
        .join("\n")}\n`,
      html: `<p>Hi ${escapeHtml(membership.user.name)}, here are your notifications from the last 24 hours:</p><ul>${items.join(
        "",
      )}</ul><p>Open Sora to see them in the app.</p>`,
    });
    sent += 1;
  }

  return NextResponse.json({ sent });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
