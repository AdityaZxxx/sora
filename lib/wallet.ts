import { cacheLife, cacheTag } from "next/cache";
import { cookies } from "next/headers";
import { cache } from "react";

import { getSession } from "@/lib/auth";
import {
  CACHE_RESOURCE,
  walletTag,
  memberWalletsTag,
  revalidateMemberWallets,
} from "@/lib/cache";
import { actorFor, assertCallerFullMember, type Caller } from "@/lib/caller";
import { ACTIVE_WALLET_COOKIE, READ_WRITE_SCOPE } from "@/lib/constants";
import { DomainError } from "@/lib/errors";
import prisma from "@/lib/prisma";
import { publishWalletChange } from "@/lib/realtime";
import { parseMemberRole } from "@/lib/roles";
import { UpdateUserCurrencySchema } from "@/schemas/userSetting";
import { WalletNameSchema } from "@/schemas/wallet";

const listMembershipsForUser = cache(async (userId: string) => {
  return await prisma.walletMembership.findMany({
    where: {
      userId,
    },
    include: {
      wallet: true,
    },
    orderBy: {
      joinedAt: "asc",
    },
  });
});

async function resolveWalletMembership(userId: string) {
  const memberships = await listMembershipsForUser(userId);

  const oldest = memberships[0];
  if (!oldest) {
    return null;
  }

  const cookieStore = await cookies();
  const activeId = cookieStore.get(ACTIVE_WALLET_COOKIE)?.value;
  if (activeId) {
    const active = memberships.find(
      (membership) => membership.walletId === activeId,
    );
    if (active) {
      return active;
    }
  }

  return oldest;
}

// seam-parse-exempt: input is the session's user id, never user-controlled.
export async function createPersonalWallet(userId: string) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.walletMembership.findFirst({
      where: {
        userId,
      },
      include: {
        wallet: true,
      },
      orderBy: {
        joinedAt: "asc",
      },
    });
    if (existing) {
      return existing;
    }

    const wallet = await tx.wallet.create({
      data: {},
    });
    return await tx.walletMembership.create({
      data: {
        walletId: wallet.id,
        userId,
      },
      include: {
        wallet: true,
      },
    });
  });
}

export const requireWallet = cache(async () => {
  const session = await getSession();
  if (!session) {
    return null;
  }

  const membership = await resolveWalletMembership(session.user.id);
  if (!membership) {
    return null;
  }
  const role = parseMemberRole(membership.role);
  return {
    session,
    wallet: membership.wallet,
    membership: { ...membership, role },
    caller: {
      walletId: membership.walletId,
      userId: session.user.id,
      role,
      scope: READ_WRITE_SCOPE,
      actorName: session.user.name,
    } satisfies Caller,
  };
});

export async function renameWallet(caller: Caller, name: string) {
  assertCallerFullMember(caller);
  const parsed = WalletNameSchema.safeParse(name);
  if (!parsed.success) {
    throw new DomainError(
      parsed.error.issues[0]?.message ?? "Check the wallet name",
    );
  }
  const wallet = await prisma.wallet.update({
    where: { id: caller.walletId },
    data: { name: parsed.data || null },
  });

  await publishWalletChange({
    walletId: caller.walletId,
    actor: actorFor(caller),
    resource: "wallet",
    message: "renamed the wallet",
  });

  return wallet;
}

export async function updateWalletCurrency(caller: Caller, currency: string) {
  assertCallerFullMember(caller);
  const parsed = UpdateUserCurrencySchema.safeParse({ currency });
  if (!parsed.success) {
    throw new DomainError(
      parsed.error.issues[0]?.message ?? "Check the currency",
    );
  }
  const wallet = await prisma.wallet.update({
    where: { id: caller.walletId },
    data: { currency: parsed.data.currency },
  });

  await publishWalletChange({
    walletId: caller.walletId,
    actor: actorFor(caller),
    resource: "wallet",
    message: "changed the wallet currency",
  });

  return wallet;
}

// Only call from a Server Action or Route Handler: cookies cannot be written
// while a page renders.
export async function setActiveWalletCookie(walletId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WALLET_COOKIE, walletId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function clearActiveWalletCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_WALLET_COOKIE);
}

export async function countWalletMembers(walletId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(walletTag(walletId, CACHE_RESOURCE.wallet));

  return await prisma.walletMembership.count({
    where: {
      walletId,
    },
  });
}

async function buildWalletsPayload(
  memberships: Awaited<ReturnType<typeof listMembershipsForUser>>,
  activeWalletId: string,
) {
  const walletIds = memberships.map((membership) => membership.walletId);
  const memberRows = await prisma.walletMembership.findMany({
    where: {
      walletId: {
        in: walletIds,
      },
    },
    select: {
      walletId: true,
    },
  });
  const countByWalletId = new Map<string, number>();
  for (const row of memberRows) {
    countByWalletId.set(
      row.walletId,
      (countByWalletId.get(row.walletId) ?? 0) + 1,
    );
  }

  return {
    active: { id: activeWalletId },
    wallets: memberships.map((membership) => ({
      id: membership.wallet.id,
      name: membership.wallet.name,
      currency: membership.wallet.currency,
      memberCount: countByWalletId.get(membership.wallet.id) ?? 1,
      joinedAt: membership.joinedAt,
    })),
  };
}

export async function listWalletsForMember(
  userId: string,
  activeWalletId: string,
) {
  const memberships = await listMembershipsForUser(userId);
  return await buildWalletsPayload(memberships, activeWalletId);
}

export async function cachedWalletsForMember(
  userId: string,
  activeWalletId: string,
) {
  "use cache";
  cacheLife("hours");

  const memberships = await listMembershipsForUser(userId);
  const walletIds = new Set([
    activeWalletId,
    ...memberships.map((membership) => membership.walletId),
  ]);
  cacheTag(
    memberWalletsTag(userId),
    ...[...walletIds].flatMap((walletId) => [
      walletTag(walletId, CACHE_RESOURCE.wallet),
      walletTag(walletId, CACHE_RESOURCE.members),
    ]),
  );

  return await buildWalletsPayload(memberships, activeWalletId);
}

export async function assertWalletMembership(walletId: string, userId: string) {
  const membership = await prisma.walletMembership.findUnique({
    where: {
      walletId_userId: {
        walletId,
        userId,
      },
    },
  });

  if (!membership) {
    throw new DomainError(
      "You are not a member of that wallet. Ask for an invite link to join it.",
    );
  }
}

export async function createAdditionalWallet(userId: string, name: string) {
  const parsedName = WalletNameSchema.safeParse(name);
  if (!parsedName.success) {
    throw new DomainError(
      parsedName.error.issues[0]?.message ?? "Check the wallet name",
    );
  }

  const created = await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.create({
      data: {
        name: parsedName.data || null,
      },
    });
    await tx.walletMembership.create({
      data: {
        walletId: wallet.id,
        userId,
      },
    });
    return wallet;
  });

  revalidateMemberWallets(userId);
  return created;
}

export async function firstWalletIdForUser(userId: string) {
  const membership = await prisma.walletMembership.findFirst({
    where: {
      userId,
    },
    orderBy: {
      joinedAt: "asc",
    },
    select: {
      walletId: true,
    },
  });
  return membership?.walletId ?? null;
}
