import type { TokenScope } from "@/lib/types";
import type {
  ApiToken,
  Wallet,
  WalletMembership,
  Prisma,
  User,
} from "@prisma/client";

import { cacheLife, cacheTag } from "next/cache";
import { headers } from "next/headers";
import { createHash, randomBytes } from "node:crypto";

import { CACHE_RESOURCE, walletTag } from "@/lib/cache";
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
      wallet: Wallet;
      user: User;
      membership: WalletMembership;
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
    include: { wallet: true, user: true },
  });

  if (!token || token.revokedAt) {
    return { ok: false, status: 401, error: "Invalid token" };
  }

  if (token.expiresAt && token.expiresAt <= new Date()) {
    return { ok: false, status: 401, error: "This token has expired" };
  }

  if (!token.wallet.agentAccessEnabled) {
    return {
      ok: false,
      status: 401,
      error: "Agent access is off for this wallet",
    };
  }

  const membership = await prisma.walletMembership.findUnique({
    where: {
      walletId_userId: {
        walletId: token.walletId,
        userId: token.userId,
      },
    },
  });

  if (!membership) {
    return {
      ok: false,
      status: 401,
      error: "The token owner is no longer a member of this wallet",
    };
  }

  const caller: Caller = {
    walletId: token.walletId,
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
    wallet: token.wallet,
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

  const wallet = await prisma.wallet.findUnique({
    where: { id: caller.walletId },
    select: { agentAccessEnabled: true },
  });
  if (!wallet?.agentAccessEnabled) {
    throw new DomainError(
      "Agent access is off for this wallet. Turn it on and try again.",
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
      walletId: caller.walletId,
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
  walletId: string,
): Promise<ApiTokenSummary[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(walletTag(walletId, CACHE_RESOURCE.apiTokens));

  return await prisma.apiToken.findMany({
    where: {
      walletId,
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
      walletId: caller.walletId,
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
    await tx.wallet.update({
      where: { id: caller.walletId },
      data: { agentAccessEnabled: enabled },
    });

    if (!enabled) {
      await tx.apiToken.updateMany({
        where: {
          walletId: caller.walletId,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    }
  });
}
