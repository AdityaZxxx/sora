import type { InviteLink } from "@prisma/client";

import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";

import { CACHE_RESOURCE, householdTag } from "@/lib/cache";
import { DomainError } from "@/lib/errors";
import { notify, notifyMembers } from "@/lib/notifications";
import prisma from "@/lib/prisma";
import { assertFullMemberRole, type MemberRole } from "@/lib/roles";

// seam-parse-exempt: inputs are session values, never user input.
export async function createInviteLink(
  householdId: string,
  userId: string,
  role: MemberRole,
) {
  assertFullMemberRole(role);
  return await prisma.inviteLink.create({
    data: {
      token: crypto.randomUUID(),
      householdId,
      createdById: userId,
    },
  });
}

const InviteIdSchema = z.object({
  id: z.string().min(1),
});

const InviteTokenSchema = z.object({
  token: z.string().min(1),
});

export async function revokeInviteLink(
  householdId: string,
  inviteLinkId: string,
  role: MemberRole,
) {
  assertFullMemberRole(role);

  const parsedId = InviteIdSchema.safeParse({ id: inviteLinkId });
  if (!parsedId.success) {
    throw new DomainError(
      parsedId.error.issues[0]?.message ?? "Invite link not found",
    );
  }
  const result = await prisma.inviteLink.updateMany({
    where: {
      id: inviteLinkId,
      householdId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
  if (result.count === 0) {
    throw new DomainError("Invite link not found");
  }
}

export async function listInviteLinks(
  householdId: string,
): Promise<InviteLink[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(householdTag(householdId, CACHE_RESOURCE.invites));

  return await prisma.inviteLink.findMany({
    where: {
      householdId,
      revokedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function joinHouseholdByInviteToken(
  token: string,
  userId: string,
  userName: string,
): Promise<string> {
  const parsed = InviteTokenSchema.safeParse({ token });
  if (!parsed.success) {
    throw new DomainError(
      "This invite link is invalid or has been revoked. Ask for a new one.",
    );
  }

  const inviteLink = await prisma.inviteLink.findFirst({
    where: {
      token: parsed.data.token,
      revokedAt: null,
    },
  });
  if (!inviteLink) {
    throw new DomainError(
      "This invite link is invalid or has been revoked. Ask for a new one.",
    );
  }

  const existingMembership = await prisma.householdMembership.findUnique({
    where: {
      householdId_userId: {
        householdId: inviteLink.householdId,
        userId,
      },
    },
  });

  if (!existingMembership) {
    await prisma.householdMembership.create({
      data: {
        householdId: inviteLink.householdId,
        userId,
      },
    });

    const otherMembers = await prisma.householdMembership.findMany({
      where: {
        householdId: inviteLink.householdId,
        userId: {
          notIn: [userId, inviteLink.createdById],
        },
      },
      select: {
        userId: true,
      },
    });
    const actor = { actorId: userId, actorName: userName };
    await notifyMembers(
      actor,
      inviteLink.householdId,
      otherMembers.map((membership) => membership.userId),
      "member_joined",
      `${userName} joined the household.`,
    );
    if (inviteLink.createdById !== userId) {
      await notify(
        actor,
        inviteLink.householdId,
        inviteLink.createdById,
        "invite_accepted",
        `${userName} accepted your invite and joined the household.`,
      );
    }
  }

  return inviteLink.householdId;
}
