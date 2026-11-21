import type { TokenScope } from "@/lib/types";
import type {
  ApiToken,
  Household,
  HouseholdMembership,
  Prisma,
  User,
} from "@prisma/client";

import { cacheLife, cacheTag } from "next/cache";
import { headers } from "next/headers";
import { createHash, randomBytes } from "node:crypto";

import { CACHE_RESOURCE, householdTag } from "@/lib/cache";
import { assertCallerFullMember, type Caller } from "@/lib/caller";
import { READ_WRITE_SCOPE } from "@/lib/constants";
import { DomainError } from "@/lib/errors";
import prisma from "@/lib/prisma";
import { parseMemberRole } from "@/lib/roles";
import {
  CreateApiTokenSchema,
  RevokeApiTokenSchema,
  SetAgentAccessSchema,
  type CreateApiTokenSchemaType,
  type RevokeApiTokenSchemaType,
  type SetAgentAccessSchemaType,
} from "@/schemas/api-tokens";

export function hashApiToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function generateApiToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashApiToken(token) };
}

export type TokenAuth =
  | {
      ok: true;
      household: Household;
      user: User;
      membership: HouseholdMembership;
      token: ApiToken;
      caller: Caller;
    }
  | { ok: false; status: number; error: string };

export async function requireToken(scope: TokenScope): Promise<TokenAuth> {
  const authorization = (await headers()).get("authorization");
  const presented = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : null;

  if (!presented) {
    return { ok: false, status: 401, error: "Missing bearer token" };
  }

  const token = await prisma.apiToken.findUnique({
    where: { tokenHash: hashApiToken(presented) },
    include: { household: true, user: true },
  });

  if (!token || token.revokedAt) {
    return { ok: false, status: 401, error: "Invalid token" };
  }

  if (token.expiresAt && token.expiresAt <= new Date()) {
    return { ok: false, status: 401, error: "This token has expired" };
  }

  if (!token.household.agentAccessEnabled) {
    return {
      ok: false,
      status: 401,
      error: "Agent access is off for this household",
    };
  }

  const membership = await prisma.householdMembership.findUnique({
    where: {
      householdId_userId: {
        householdId: token.householdId,
        userId: token.userId,
      },
    },
  });

  if (!membership) {
    return {
      ok: false,
      status: 401,
      error: "The token owner is no longer a member of this household",
    };
  }

  const caller: Caller = {
    householdId: token.householdId,
    userId: token.userId,
    role: parseMemberRole(membership.role),
    scope: token.scope as TokenScope,
    actorName: token.user.name,
  };

  if (scope === READ_WRITE_SCOPE) {
    if (token.scope !== READ_WRITE_SCOPE) {
      return { ok: false, status: 403, error: "This token is read-only" };
    }
    try {
      assertCallerFullMember(
        caller,
        "View-only members cannot use a read-write token",
      );
    } catch (cause) {
      if (!(cause instanceof DomainError)) {
        throw cause;
      }
      return {
        ok: false,
        status: 403,
        error: "View-only members cannot use a read-write token",
      };
    }
  }

  return {
    ok: true,
    household: token.household,
    user: token.user,
    membership,
    token,
    caller,
  };
}

const apiTokenSelect = {
  id: true,
  name: true,
  scope: true,
  createdAt: true,
  expiresAt: true,
  user: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

export type ApiTokenSummary = Prisma.ApiTokenGetPayload<{
  select: typeof apiTokenSelect;
}>;

export async function createApiToken(
  caller: Caller,
  input: CreateApiTokenSchemaType,
): Promise<{ id: string; token: string }> {
  const parsed = CreateApiTokenSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError(
      parsed.error.issues[0]?.message ?? "Check the token details",
    );
  }

  const household = await prisma.household.findUnique({
    where: { id: caller.householdId },
    select: { agentAccessEnabled: true },
  });
  if (!household?.agentAccessEnabled) {
    throw new DomainError(
      "Agent access is off for this household. Turn it on and try again.",
    );
  }

  if (parsed.data.scope === READ_WRITE_SCOPE) {
    assertCallerFullMember(
      caller,
      "View-only members cannot create a read-write token. Choose read only instead.",
    );
  }

  const { token, tokenHash } = generateApiToken();
  const created = await prisma.apiToken.create({
    data: {
      householdId: caller.householdId,
      userId: caller.userId,
      name: parsed.data.name,
      scope: parsed.data.scope,
      tokenHash,
      expiresAt: parsed.data.expiresAt ?? null,
    },
  });

  return { id: created.id, token };
}

export async function listApiTokens(
  householdId: string,
): Promise<ApiTokenSummary[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(householdTag(householdId, CACHE_RESOURCE.apiTokens));

  return await prisma.apiToken.findMany({
    where: {
      householdId,
      revokedAt: null,
    },
    select: apiTokenSelect,
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function revokeApiToken(
  caller: Caller,
  input: RevokeApiTokenSchemaType,
) {
  const parsed = RevokeApiTokenSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError(
      parsed.error.issues[0]?.message ?? "Check the token to revoke",
    );
  }

  const token = await prisma.apiToken.findFirst({
    where: {
      id: parsed.data.id,
      householdId: caller.householdId,
    },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!token) {
    throw new DomainError(
      "Token not found. It may have been revoked. Refresh and try again.",
    );
  }

  if (token.userId !== caller.userId) {
    assertCallerFullMember(
      caller,
      "View-only members can only revoke their own tokens. Ask a full member to revoke it.",
    );
  }

  await prisma.apiToken.updateMany({
    where: {
      id: token.id,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
}

export async function setAgentAccess(
  caller: Caller,
  enabled: SetAgentAccessSchemaType["enabled"],
) {
  assertCallerFullMember(caller);

  const parsed = SetAgentAccessSchema.safeParse({ enabled });
  if (!parsed.success) {
    throw new DomainError(parsed.error.issues[0]?.message ?? "Invalid setting");
  }

  await prisma.$transaction(async (tx) => {
    await tx.household.update({
      where: { id: caller.householdId },
      data: { agentAccessEnabled: enabled },
    });

    if (!enabled) {
      await tx.apiToken.updateMany({
        where: {
          householdId: caller.householdId,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    }
  });
}
