import { cacheLife, cacheTag } from "next/cache";
import { cookies } from "next/headers";
import { cache } from "react";

import { getSession } from "@/lib/auth";
import { CACHE_RESOURCE, householdTag } from "@/lib/cache";
import { actorFor, assertCallerFullMember, type Caller } from "@/lib/caller";
import { ACTIVE_HOUSEHOLD_COOKIE, READ_WRITE_SCOPE } from "@/lib/constants";
import { DomainError } from "@/lib/errors";
import prisma from "@/lib/prisma";
import { publishHouseholdChange } from "@/lib/realtime";
import { parseMemberRole } from "@/lib/roles";
import { HouseholdNameSchema } from "@/schemas/household";
import { UpdateUserCurrencySchema } from "@/schemas/userSetting";

async function resolveHouseholdMembership(userId: string) {
  const memberships = await prisma.householdMembership.findMany({
    where: {
      userId,
    },
    include: {
      household: true,
    },
    orderBy: {
      joinedAt: "asc",
    },
  });

  const oldest = memberships[0];
  if (!oldest) {
    return null;
  }

  const cookieStore = await cookies();
  const activeId = cookieStore.get(ACTIVE_HOUSEHOLD_COOKIE)?.value;
  if (activeId) {
    const active = memberships.find(
      (membership) => membership.householdId === activeId,
    );
    if (active) {
      return active;
    }
  }

  return oldest;
}

// seam-parse-exempt: input is the session's user id, never user-controlled.
export async function createPersonalHousehold(userId: string) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.householdMembership.findFirst({
      where: {
        userId,
      },
      include: {
        household: true,
      },
      orderBy: {
        joinedAt: "asc",
      },
    });
    if (existing) {
      return existing;
    }

    const household = await tx.household.create({
      data: {},
    });
    return await tx.householdMembership.create({
      data: {
        householdId: household.id,
        userId,
      },
      include: {
        household: true,
      },
    });
  });
}

export const requireHousehold = cache(async () => {
  const session = await getSession();
  if (!session) {
    return null;
  }

  const membership = await resolveHouseholdMembership(session.user.id);
  if (!membership) {
    return null;
  }
  const role = parseMemberRole(membership.role);
  return {
    session,
    household: membership.household,
    membership: { ...membership, role },
    caller: {
      householdId: membership.householdId,
      userId: session.user.id,
      role,
      scope: READ_WRITE_SCOPE,
      actorName: session.user.name,
    } satisfies Caller,
  };
});

export async function renameHousehold(caller: Caller, name: string) {
  assertCallerFullMember(caller);
  const parsed = HouseholdNameSchema.safeParse(name);
  if (!parsed.success) {
    throw new DomainError(
      parsed.error.issues[0]?.message ?? "Check the household name",
    );
  }
  const household = await prisma.household.update({
    where: { id: caller.householdId },
    data: { name: parsed.data || null },
  });

  await publishHouseholdChange({
    householdId: caller.householdId,
    actor: actorFor(caller),
    resource: "household",
    message: "renamed the household",
  });

  return household;
}

export async function updateHouseholdCurrency(
  caller: Caller,
  currency: string,
) {
  assertCallerFullMember(caller);
  const parsed = UpdateUserCurrencySchema.safeParse({ currency });
  if (!parsed.success) {
    throw new DomainError(
      parsed.error.issues[0]?.message ?? "Check the currency",
    );
  }
  const household = await prisma.household.update({
    where: { id: caller.householdId },
    data: { currency: parsed.data.currency },
  });

  await publishHouseholdChange({
    householdId: caller.householdId,
    actor: actorFor(caller),
    resource: "household",
    message: "changed the household currency",
  });

  return household;
}

// Only call from a Server Action or Route Handler: cookies cannot be written
// while a page renders.
export async function setActiveHouseholdCookie(householdId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_HOUSEHOLD_COOKIE, householdId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function clearActiveHouseholdCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_HOUSEHOLD_COOKIE);
}

export async function countHouseholdMembers(householdId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(householdTag(householdId, CACHE_RESOURCE.household));

  return await prisma.householdMembership.count({
    where: {
      householdId,
    },
  });
}

export async function assertHouseholdMembership(
  householdId: string,
  userId: string,
) {
  const membership = await prisma.householdMembership.findUnique({
    where: {
      householdId_userId: {
        householdId,
        userId,
      },
    },
  });

  if (!membership) {
    throw new DomainError(
      "You are not a member of that household. Ask for an invite link to join it.",
    );
  }
}

export async function createAdditionalHousehold(userId: string, name: string) {
  const parsedName = HouseholdNameSchema.safeParse(name);
  if (!parsedName.success) {
    throw new DomainError(
      parsedName.error.issues[0]?.message ?? "Check the household name",
    );
  }

  return await prisma.$transaction(async (tx) => {
    const created = await tx.household.create({
      data: {
        name: parsedName.data || null,
      },
    });
    await tx.householdMembership.create({
      data: {
        householdId: created.id,
        userId,
      },
    });
    return created;
  });
}

export async function firstHouseholdIdForUser(userId: string) {
  const membership = await prisma.householdMembership.findFirst({
    where: {
      userId,
    },
    orderBy: {
      joinedAt: "asc",
    },
    select: {
      householdId: true,
    },
  });
  return membership?.householdId ?? null;
}
