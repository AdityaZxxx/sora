import { cacheLife, cacheTag } from "next/cache";

import { hasOpenBalance } from "@/lib/balances";
import {
  CACHE_RESOURCE,
  walletTag,
  revalidateMemberWallets,
} from "@/lib/cache";
import {
  actorFor,
  assertCallerCanManage,
  assertCallerIsOwner,
  type Caller,
} from "@/lib/caller";
import { CO_OWNER_ROLE, OWNER_ROLE } from "@/lib/constants";
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
      leftAt: null,
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

export async function listFormerMembers(walletId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(walletTag(walletId, CACHE_RESOURCE.members));

  return prisma.walletMembership.findMany({
    where: {
      walletId,
      leftAt: { not: null },
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
      leftAt: "desc",
    },
  });
}

// seam-parse-exempt: inputs are session values, never user input.
export async function leaveWallet(caller: Caller) {
  if (caller.role === OWNER_ROLE) {
    throw new DomainError(
      "Appoint a co-owner as the new owner before leaving this wallet",
    );
  }
  if (await hasOpenBalance(caller.walletId, caller.userId)) {
    throw new DomainError(
      "Settle your balance in this wallet before leaving it",
    );
  }

  const actor = actorFor(caller);
  await prisma.$transaction(async (tx) => {
    await tx.walletMembership.update({
      where: {
        walletId_userId: {
          walletId: caller.walletId,
          userId: caller.userId,
        },
      },
      data: { leftAt: new Date(), isPersonal: false },
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
        leftAt: null,
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
  assertCallerCanManage(caller);

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

  if (!removed || removed.leftAt) {
    throw new DomainError("Member not found");
  }
  if (await hasOpenBalance(caller.walletId, userId)) {
    throw new DomainError(
      "Settle this member's balance in the wallet before removing them",
    );
  }
  if (removed.role === OWNER_ROLE) {
    throw new DomainError("The owner cannot be removed by another member");
  }
  if (removed.role === CO_OWNER_ROLE && caller.role !== OWNER_ROLE) {
    throw new DomainError("Only the owner can remove a co-owner");
  }

  await prisma.$transaction(async (tx) => {
    await tx.walletMembership.updateMany({
      where: {
        walletId: caller.walletId,
        userId,
        leftAt: null,
      },
      data: { leftAt: new Date(), isPersonal: false },
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
        leftAt: null,
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

  assertCallerIsOwner(caller, "Only the owner can change roles in this wallet");

  if (userId === caller.userId) {
    throw new DomainError("Transfer ownership to another co-owner instead");
  }

  const target = await prisma.walletMembership.findUnique({
    where: {
      walletId_userId: {
        walletId: caller.walletId,
        userId,
      },
      leftAt: null,
    },
  });

  if (!target) {
    throw new DomainError("Member not found");
  }
  if (target.role === OWNER_ROLE) {
    throw new DomainError("The owner's role cannot be changed");
  }
  if (nextRole === OWNER_ROLE && target.role !== CO_OWNER_ROLE) {
    throw new DomainError("Only a co-owner can become the owner");
  }

  await prisma.$transaction(async (tx) => {
    if (nextRole === OWNER_ROLE) {
      await tx.walletMembership.update({
        where: {
          walletId_userId: {
            walletId: caller.walletId,
            userId: caller.userId,
          },
        },
        data: { role: CO_OWNER_ROLE },
      });
    }
    await tx.walletMembership.update({
      where: {
        walletId_userId: {
          walletId: caller.walletId,
          userId,
        },
      },
      data: { role: nextRole },
    });
  });

  await publishWalletChange({
    walletId: caller.walletId,
    actor: actorFor(caller),
    resource: "members",
    message: "changed a member's role",
  });

  return { userId, role: nextRole };
}
