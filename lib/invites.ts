import type { Actor } from "@/lib/caller";
import type { InviteLink } from "@prisma/client";

import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";

import {
  CACHE_RESOURCE,
  walletTag,
  revalidateMemberWallets,
} from "@/lib/cache";
import { MEMBER_ROLE } from "@/lib/constants";
import { DomainError } from "@/lib/errors";
import { notify, notifyMembers } from "@/lib/notifications";
import prisma from "@/lib/prisma";
import { publishWalletChange } from "@/lib/realtime";
import { assertCanManage, type MemberRole } from "@/lib/roles";
import { createPersonalWallet } from "@/lib/wallet";

function notifyInviteChange(walletId: string, actor: Actor, message: string) {
  return publishWalletChange({
    walletId,
    actor,
    resource: "invites",
    message,
  });
}

// seam-parse-exempt: inputs are session values, never user input.
export async function createInviteLink(
  walletId: string,
  actor: Actor,
  role: MemberRole,
) {
  assertCanManage(role);
  const created = await prisma.inviteLink.create({
    data: {
      token: crypto.randomUUID(),
      walletId,
      createdById: actor.actorId,
    },
  });

  await notifyInviteChange(walletId, actor, "created an invite link");

  return created;
}

// seam-parse-exempt: inputs are session values, never user input.
export async function rotateInviteLink(
  walletId: string,
  actor: Actor,
  role: MemberRole,
) {
  assertCanManage(role);
  const created = await prisma.$transaction(async (tx) => {
    await tx.inviteLink.updateMany({
      where: { walletId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return await tx.inviteLink.create({
      data: {
        token: crypto.randomUUID(),
        walletId,
        createdById: actor.actorId,
      },
    });
  });

  await notifyInviteChange(walletId, actor, "rotated the invite link");

  return created;
}

const InviteIdSchema = z.object({
  id: z.string().min(1),
});

const InviteTokenSchema = z.object({
  token: z.string().min(1),
});

export async function revokeInviteLink(
  walletId: string,
  inviteLinkId: string,
  role: MemberRole,
  actor: Actor,
) {
  assertCanManage(role);

  const parsedId = InviteIdSchema.safeParse({ id: inviteLinkId });
  if (!parsedId.success) {
    throw new DomainError(
      parsedId.error.issues[0]?.message ?? "Invite link not found",
    );
  }
  const result = await prisma.inviteLink.updateMany({
    where: {
      id: inviteLinkId,
      walletId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
  if (result.count === 0) {
    throw new DomainError("Invite link not found");
  }

  await notifyInviteChange(walletId, actor, "revoked the invite link");
}

export async function listInviteLinks(walletId: string): Promise<InviteLink[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(walletTag(walletId, CACHE_RESOURCE.invites));

  return await prisma.inviteLink.findMany({
    where: {
      walletId,
      revokedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function joinWalletByInviteToken(
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
    include: { wallet: { select: { currency: true } } },
  });
  if (!inviteLink) {
    throw new DomainError(
      "This invite link is invalid or has been revoked. Ask for a new one.",
    );
  }

  const existingMembership = await prisma.walletMembership.findUnique({
    where: {
      walletId_userId: {
        walletId: inviteLink.walletId,
        userId,
      },
    },
  });

  const actor = { actorId: userId, actorName: userName };
  let joined = false;
  if (existingMembership?.leftAt) {
    await prisma.walletMembership.update({
      where: {
        walletId_userId: {
          walletId: inviteLink.walletId,
          userId,
        },
      },
      data: {
        leftAt: null,
        role: MEMBER_ROLE,
        isPersonal: false,
      },
    });
    joined = true;
  } else if (!existingMembership) {
    await prisma.walletMembership.create({
      data: {
        walletId: inviteLink.walletId,
        userId,
        role: MEMBER_ROLE,
      },
    });
    joined = true;
  }

  if (joined) {
    await publishWalletChange({
      walletId: inviteLink.walletId,
      actor,
      resource: "members",
      message: "joined the wallet",
      scope: "member-joined",
    });

    const otherMembers = await prisma.walletMembership.findMany({
      where: {
        walletId: inviteLink.walletId,
        leftAt: null,
        userId: {
          notIn: [userId, inviteLink.createdById],
        },
      },
      select: {
        userId: true,
      },
    });
    await notifyMembers(
      actor,
      inviteLink.walletId,
      otherMembers.map((membership) => membership.userId),
      "member_joined",
      `${userName} joined the wallet.`,
    );
    if (inviteLink.createdById !== userId) {
      await notify(
        actor,
        inviteLink.walletId,
        inviteLink.createdById,
        "invite_accepted",
        `${userName} accepted your invite and joined the wallet.`,
      );
    }
    revalidateMemberWallets(userId);
  }

  const personal = await prisma.walletMembership.findFirst({
    where: { userId, leftAt: null, isPersonal: true },
    select: { walletId: true },
  });
  if (!personal) {
    await createPersonalWallet(actor, inviteLink.wallet.currency);
  }

  return inviteLink.walletId;
}
