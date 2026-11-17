"use server";

import type {
  CreateApiTokenSchemaType,
  RevokeApiTokenSchemaType,
  SetAgentAccessSchemaType,
} from "@/schemas/api-tokens";

import { type ActionResult, withHouseholdAction } from "@/lib/action-result";
import {
  createApiToken as createApiTokenSeam,
  listApiTokens as listApiTokensSeam,
  revokeApiToken as revokeApiTokenSeam,
  setAgentAccess as setAgentAccessSeam,
  type ApiTokenSummary,
} from "@/lib/api-token";

export type { ApiTokenSummary };

export async function createApiToken(
  form: CreateApiTokenSchemaType,
): Promise<ActionResult<{ id: string; token: string }>> {
  return withHouseholdAction(
    "Unable to create the token. Check the details and try again.",
    ({ household, session, membership }) =>
      createApiTokenSeam(household.id, session.user.id, membership.role, form),
  );
}

export async function listApiTokens(): Promise<
  ActionResult<ApiTokenSummary[]>
> {
  return withHouseholdAction(
    "Unable to load the tokens. Refresh the page and try again.",
    ({ household }) => listApiTokensSeam(household.id),
  );
}

export async function revokeApiToken(
  form: RevokeApiTokenSchemaType,
): Promise<ActionResult> {
  return withHouseholdAction(
    "Unable to revoke the token. Try again.",
    async ({ household, session, membership }) => {
      await revokeApiTokenSeam(
        household.id,
        session.user.id,
        membership.role,
        form,
      );
    },
  );
}

export async function setAgentAccess(
  form: SetAgentAccessSchemaType,
): Promise<ActionResult> {
  return withHouseholdAction(
    "Unable to change agent access. Try again.",
    async ({ household, membership }) => {
      await setAgentAccessSeam(household.id, form.enabled, membership.role);
    },
  );
}
