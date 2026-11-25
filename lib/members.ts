import { cacheLife, cacheTag } from "next/cache";

import {
  CACHE_RESOURCE,
  walletTag,
  revalidateMemberWallets,
} from "@/lib/cache";
import { actorFor, assertCallerFullMember, type Caller } from "@/lib/caller";
import { FULL_MEMBER_ROLE } from "@/lib/constants";
import { DomainError } from "@/lib/errors";
import { notifyWalletExcept } from "@/lib/notifications";
import prisma from "@/lib/prisma";
import { publishWalletChange } from "@/lib/realtime";
import {
  RemoveMemberSchema,
  SetEmailDigestSchema,
  SetMemberRoleSchema,
  type RemoveMemberSchemaType,
  type SetEmailDigestSchemaType,
  type SetMemberRoleSchemaType,
} from "@/schemas/membership";

export async function listMembers(walletId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(walletTag(walletId, CACHE_RESOURCE.members));

  return prisma.walletMembership.findMany({
    where: {
      walletId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: {
      joinedAt: "asc",
    },
  });
}

// seam-parse-exempt: inputs are session values, never user input.
export async function leaveWallet(caller: Caller) {
  const actor = actorFor(caller);
  await prisma.$transaction(async (tx) => {
    await tx.walletMembership.delete({
      where: {
        walletId_userId: {
          walletId: caller.walletId,
          userId: caller.userId,
        },
      },
    });

    await tx.apiToken.updateMany({
      where: {
        walletId: caller.walletId,
        userId: caller.userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    const remaining = await tx.walletMembership.count({
      where: {
        walletId: caller.walletId,
      },
    });

    if (remaining === 0) {
      await tx.wallet.delete({
        where: {
          id: caller.walletId,
        },
      });
    }
  });

  await notifyWalletExcept(
    actor,
    caller.walletId,
    caller.userId,
    "member_left",
    `${caller.actorName} left the wallet.`,
  );

  await publishWalletChange({
    walletId: caller.walletId,
    actor,
    resource: "members",
    message: "left the wallet",
  });
  revalidateMemberWallets(caller.userId);
}

export async function setEmailDigest(
  walletId: string,
  userId: string,
  input: SetEmailDigestSchemaType,
) {
  const parsed = SetEmailDigestSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError(parsed.error.issues[0]?.message ?? "Bad request");
  }

  return await prisma.walletMembership.update({
    where: {
      walletId_userId: {
        walletId,
        userId,
      },
    },
    data: {
      emailDigest: parsed.data.emailDigest,
    },
  });
}

export async function removeMember(
  caller: Caller,
  input: RemoveMemberSchemaType,
) {
  assertCallerFullMember(caller);

  const parsed = RemoveMemberSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError(parsed.error.issues[0]?.message ?? "Bad request");
  }

  const { userId } = parsed.data;

  if (userId === caller.userId) {
    throw new DomainError("Use leave wallet to remove yourself");
  }

  const removed = await prisma.walletMembership.findUnique({
    where: {
      walletId_userId: {
        walletId: caller.walletId,
        userId,
      },
    },
    include: {
      user: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!removed) {
    throw new DomainError("Member not found");
  }

  await prisma.$transaction(async (tx) => {
    await tx.walletMembership.deleteMany({
      where: {
        walletId: caller.walletId,
        userId,
      },
    });

    await tx.apiToken.updateMany({
      where: {
        walletId: caller.walletId,
        userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    const remaining = await tx.walletMembership.count({
      where: {
        walletId: caller.walletId,
      },
    });

    if (remaining === 0) {
      await tx.wallet.delete({
        where: {
          id: caller.walletId,
        },
      });
    }
  });

  await publishWalletChange({
    walletId: caller.walletId,
    actor: actorFor(caller),
    resource: "members",
    message: `removed ${removed.user.name} from the wallet`,
  });
  revalidateMemberWallets(userId);

  return removed.user.name;
}

export async function setMemberRole(
  caller: Caller,
  input: SetMemberRoleSchemaType,
) {
  const parsed = SetMemberRoleSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError(parsed.error.issues[0]?.message ?? "Bad request");
  }

  const { userId, role: nextRole } = parsed.data;

  if (userId === caller.userId) {
    if (nextRole !== FULL_MEMBER_ROLE) {
      throw new DomainError("Use leave wallet to give up your own edit access");
    }
    const fullMemberCount = await prisma.walletMembership.count({
      where: {
        walletId: caller.walletId,
        role: FULL_MEMBER_ROLE,
      },
    });
    if (fullMemberCount > 0) {
      throw new DomainError("Only another member can change your role");
    }
  } else {
    assertCallerFullMember(caller);
  }

  const target = await prisma.walletMembership.findUnique({
    where: {
      walletId_userId: {
        walletId: caller.walletId,
        userId,
      },
    },
  });

  if (!target) {
    throw new DomainError("Member not found");
  }

  await prisma.walletMembership.update({
    where: {
      walletId_userId: {
        walletId: caller.walletId,
        userId,
      },
    },
    data: {
      role: nextRole,
    },
  });

  await publishWalletChange({
    walletId: caller.walletId,
    actor: actorFor(caller),
    resource: "members",
    message: "changed a member's role",
  });

  return { userId, role: nextRole };
}
