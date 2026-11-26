"use server";

import type {
  CreateApiTokenSchemaType,
  RevokeApiTokenSchemaType,
  SetAgentAccessSchemaType,
} from "@/schemas/api-tokens";

import { revalidateTag } from "next/cache";

import { fail, ok, type ActionResult } from "@/lib/action-result";
import {
  createApiToken as createApiTokenSeam,
  revokeApiToken as revokeApiTokenSeam,
  setAgentAccess as setAgentAccessSeam,
} from "@/lib/api-token";
import { getSession } from "@/lib/auth";
import { CACHE_RESOURCE, revalidateWallet } from "@/lib/cache";
import { DomainError } from "@/lib/errors";

function actionError(cause: unknown): ActionResult<never> {
  return fail(cause instanceof DomainError ? cause.message : "Try again");
}

export async function createApiTokenForm(
  input: CreateApiTokenSchemaType,
): Promise<ActionResult<{ id: string; token: string }>> {
  const session = await getSession();
  if (!session)
    return actionError(new DomainError("Sign in to create a token"));
  try {
    const created = await createApiTokenSeam(session.user.id, input);
    revalidateTag(`user:${session.user.id}:api-tokens`, { expire: 0 });
    return ok(created);
  } catch (cause) {
    return actionError(cause);
  }
}

export async function revokeApiTokenForm(
  input: RevokeApiTokenSchemaType,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session)
    return actionError(new DomainError("Sign in to revoke a token"));
  try {
    await revokeApiTokenSeam(session.user.id, input);
    revalidateTag(`user:${session.user.id}:api-tokens`, { expire: 0 });
    return { ok: true };
  } catch (cause) {
    return actionError(cause);
  }
}

export async function setAgentAccessForm(
  input: SetAgentAccessSchemaType,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session)
    return actionError(new DomainError("Sign in to change agent access"));
  try {
    await setAgentAccessSeam(session.user.id, input);
    revalidateTag(`user:${session.user.id}:api-tokens`, { expire: 0 });
    revalidateWallet(input.walletId, [
      CACHE_RESOURCE.wallet,
      CACHE_RESOURCE.apiTokens,
    ]);
    return { ok: true };
  } catch (cause) {
    return actionError(cause);
  }
}
