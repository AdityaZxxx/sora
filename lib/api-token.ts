import type { TokenScope } from "@/lib/types";
import type {
  ApiToken,
  Prisma,
  User,
  Wallet,
  WalletMembership,
} from "@prisma/client";

import { cacheLife, cacheTag } from "next/cache";
import { headers } from "next/headers";
import { createHash, randomBytes } from "node:crypto";

import { assertCallerCanWrite, type Caller } from "@/lib/caller";
import { READ_WRITE_SCOPE } from "@/lib/constants";
import { DomainError } from "@/lib/errors";
import prisma from "@/lib/prisma";
import { assertCanManage, parseMemberRole } from "@/lib/roles";
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

export const TOKEN_WALLET_HEADER = "x-sora-wallet";

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

export async function requireToken(
  scope: TokenScope,
  requestedWalletId?: string | null,
): Promise<TokenAuth> {
  const authorization = (await headers()).get("authorization");
  const presented = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : null;

  if (!presented) {
    return { ok: false, status: 401, error: "Missing bearer token" };
  }

  const token = await prisma.apiToken.findUnique({
    where: { tokenHash: hashApiToken(presented) },
    include: {
      user: true,
      wallets: { include: { wallet: true } },
    },
  });

  if (!token || token.revokedAt) {
    return { ok: false, status: 401, error: "Invalid token" };
  }

  if (token.expiresAt && token.expiresAt <= new Date()) {
    return { ok: false, status: 401, error: "This token has expired" };
  }

  const allowed = token.wallets.map((entry) => entry.wallet);
  const wallet = requestedWalletId
    ? allowed.find((entry) => entry.id === requestedWalletId)
    : allowed.length === 1
      ? allowed[0]
      : undefined;

  if (requestedWalletId && !wallet) {
    return {
      ok: false,
      status: 403,
      error: "This token is not scoped to that wallet",
    };
  }
  if (!wallet) {
    return {
      ok: false,
      status: 400,
      error: `Choose a wallet with the ${TOKEN_WALLET_HEADER} header`,
    };
  }
  if (!wallet.agentAccessEnabled) {
    return {
      ok: false,
      status: 401,
      error: "Agent access is off for this wallet",
    };
  }

  const membership = await prisma.walletMembership.findUnique({
    where: {
      walletId_userId: {
        walletId: wallet.id,
        userId: token.userId,
      },
      leftAt: null,
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
    walletId: wallet.id,
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
      assertCallerCanWrite(caller, "Viewers cannot use a read-write token");
    } catch (cause) {
      if (!(cause instanceof DomainError)) {
        throw cause;
      }
      return {
        ok: false,
        status: 403,
        error: "Viewers cannot use a read-write token",
      };
    }
  }

  return { ok: true, wallet, user: token.user, membership, token, caller };
}

const apiTokenSelect = {
  id: true,
  name: true,
  scope: true,
  createdAt: true,
  expiresAt: true,
  revokedAt: true,
  wallets: {
    select: {
      wallet: {
        select: {
          id: true,
          name: true,
          currency: true,
          agentAccessEnabled: true,
        },
      },
    },
  },
} as const;

export type ApiTokenSummary = Prisma.ApiTokenGetPayload<{
  select: typeof apiTokenSelect;
}>;

export async function createApiToken(
  userId: string,
  input: CreateApiTokenSchemaType,
): Promise<{ id: string; token: string }> {
  const parsed = CreateApiTokenSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError(
      parsed.error.issues[0]?.message ?? "Check the token details",
    );
  }

  const { name, scope, expiresAt, walletIds } = parsed.data;

  const wallets = await prisma.wallet.findMany({
    where: {
      id: { in: walletIds },
      memberships: { some: { userId, leftAt: null } },
    },
    select: { id: true, agentAccessEnabled: true },
  });
  if (wallets.length !== walletIds.length) {
    throw new DomainError("Choose wallets you belong to");
  }
  if (wallets.some((wallet) => !wallet.agentAccessEnabled)) {
    throw new DomainError(
      "Turn on agent access for every selected wallet before creating a token",
    );
  }

  if (scope === READ_WRITE_SCOPE) {
    const viewer = await prisma.walletMembership.findFirst({
      where: {
        userId,
        walletId: { in: walletIds },
        leftAt: null,
        role: "viewer",
      },
      select: { walletId: true },
    });
    if (viewer) {
      throw new DomainError(
        "Viewers cannot create a read-write token. Choose read only instead.",
      );
    }
  }

  const { token, tokenHash } = generateApiToken();
  const created = await prisma.apiToken.create({
    data: {
      userId,
      name,
      scope,
      tokenHash,
      expiresAt: expiresAt ?? null,
      wallets: {
        create: walletIds.map((walletId) => ({ walletId })),
      },
    },
  });

  return { id: created.id, token };
}

export async function listApiTokens(
  userId: string,
): Promise<ApiTokenSummary[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(`user:${userId}:api-tokens`);

  return await prisma.apiToken.findMany({
    where: { userId },
    select: apiTokenSelect,
    orderBy: { createdAt: "desc" },
  });
}

export async function revokeApiToken(
  userId: string,
  input: RevokeApiTokenSchemaType,
) {
  const parsed = RevokeApiTokenSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError(
      parsed.error.issues[0]?.message ?? "Check the token to revoke",
    );
  }

  const result = await prisma.apiToken.updateMany({
    where: { id: parsed.data.id, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (result.count === 0) {
    throw new DomainError(
      "Token not found. It may have been revoked. Refresh and try again.",
    );
  }
}

export async function setAgentAccess(
  userId: string,
  input: SetAgentAccessSchemaType,
) {
  const parsed = SetAgentAccessSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError(parsed.error.issues[0]?.message ?? "Invalid setting");
  }

  const membership = await prisma.walletMembership.findUnique({
    where: {
      walletId_userId: {
        walletId: parsed.data.walletId,
        userId,
      },
      leftAt: null,
    },
  });
  if (!membership) {
    throw new DomainError("You cannot change agent access for this wallet");
  }
  assertCanManage(parseMemberRole(membership.role));

  await prisma.$transaction(async (tx) => {
    await tx.wallet.update({
      where: { id: parsed.data.walletId },
      data: { agentAccessEnabled: parsed.data.enabled },
    });

    if (!parsed.data.enabled) {
      await tx.apiToken.updateMany({
        where: {
          wallets: { some: { walletId: parsed.data.walletId } },
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    }
  });
}
