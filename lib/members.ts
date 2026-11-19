import { cacheLife, cacheTag } from "next/cache";

import { CACHE_RESOURCE, householdTag } from "@/lib/cache";
import { FULL_MEMBER_ROLE } from "@/lib/constants";
import { DomainError } from "@/lib/errors";
import { notifyHouseholdExcept } from "@/lib/notifications";
import prisma from "@/lib/prisma";
import { publishHouseholdChange } from "@/lib/realtime";
import { assertFullMemberRole, type MemberRole } from "@/lib/roles";
import {
  RemoveMemberSchema,
  SetEmailDigestSchema,
  SetMemberRoleSchema,
  type RemoveMemberSchemaType,
  type SetEmailDigestSchemaType,
  type SetMemberRoleSchemaType,
} from "@/schemas/membership";

export async function listMembers(householdId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(householdTag(householdId, CACHE_RESOURCE.members));

  return prisma.householdMembership.findMany({
    where: {
      householdId,
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
export async function leaveHousehold(
  householdId: string,
  userId: string,
  userName: string,
) {
  await prisma.$transaction(async (tx) => {
    await tx.householdMembership.delete({
      where: {
        householdId_userId: {
          householdId,
          userId,
        },
      },
    });

    await tx.apiToken.updateMany({
      where: {
        householdId,
        userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    const remaining = await tx.householdMembership.count({
      where: {
        householdId,
      },
    });

    if (remaining === 0) {
      await tx.household.delete({
        where: {
          id: householdId,
        },
      });
    }
  });

  await notifyHouseholdExcept(
    householdId,
    userId,
    "member_left",
    `${userName} left the household.`,
  );

  await publishHouseholdChange({
    householdId,
    resource: "members",
    message: "left the household",
  });
}

export async function setEmailDigest(
  householdId: string,
  userId: string,
  input: SetEmailDigestSchemaType,
) {
  const parsed = SetEmailDigestSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError(parsed.error.issues[0]?.message ?? "Bad request");
  }

  return await prisma.householdMembership.update({
    where: {
      householdId_userId: {
        householdId,
        userId,
      },
    },
    data: {
      emailDigest: parsed.data.emailDigest,
    },
  });
}

export async function removeMember(
  householdId: string,
  callerId: string,
  role: MemberRole,
  input: RemoveMemberSchemaType,
) {
  assertFullMemberRole(role);

  const parsed = RemoveMemberSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError(parsed.error.issues[0]?.message ?? "Bad request");
  }

  const { userId } = parsed.data;

  if (userId === callerId) {
    throw new DomainError("Use leave household to remove yourself");
  }

  const removed = await prisma.householdMembership.findUnique({
    where: {
      householdId_userId: {
        householdId,
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
    await tx.householdMembership.deleteMany({
      where: {
        householdId,
        userId,
      },
    });

    await tx.apiToken.updateMany({
      where: {
        householdId,
        userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    const remaining = await tx.householdMembership.count({
      where: {
        householdId,
      },
    });

    if (remaining === 0) {
      await tx.household.delete({
        where: {
          id: householdId,
        },
      });
    }
  });

  await publishHouseholdChange({
    householdId,
    resource: "members",
    message: `removed ${removed.user.name} from the household`,
  });

  return removed.user.name;
}

export async function setMemberRole(
  householdId: string,
  callerId: string,
  role: MemberRole,
  input: SetMemberRoleSchemaType,
) {
  const parsed = SetMemberRoleSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError(parsed.error.issues[0]?.message ?? "Bad request");
  }

  const { userId, role: nextRole } = parsed.data;

  if (userId === callerId) {
    if (nextRole !== FULL_MEMBER_ROLE) {
      throw new DomainError(
        "Use leave household to give up your own edit access",
      );
    }
    const fullMemberCount = await prisma.householdMembership.count({
      where: {
        householdId,
        role: FULL_MEMBER_ROLE,
      },
    });
    if (fullMemberCount > 0) {
      throw new DomainError("Only another member can change your role");
    }
  } else {
    assertFullMemberRole(role);
  }

  const target = await prisma.householdMembership.findUnique({
    where: {
      householdId_userId: {
        householdId,
        userId,
      },
    },
  });

  if (!target) {
    throw new DomainError("Member not found");
  }

  await prisma.householdMembership.update({
    where: {
      householdId_userId: {
        householdId,
        userId,
      },
    },
    data: {
      role: nextRole,
    },
  });

  await publishHouseholdChange({
    householdId,
    resource: "members",
    message: "changed a member's role",
  });

  return { userId, role: nextRole };
}
