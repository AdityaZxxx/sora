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
import { CACHE_RESOURCE, revalidateHousehold } from "@/lib/cache";

export type { ApiTokenSummary };

export async function createApiToken(
  form: CreateApiTokenSchemaType,
): Promise<ActionResult<{ id: string; token: string }>> {
  return withHouseholdAction(
    "Unable to create the token. Check the details and try again.",
    async ({ household, session, membership }) => {
      const created = await createApiTokenSeam(
        household.id,
        session.user.id,
        membership.role,
        form,
      );
      revalidateHousehold(household.id, [CACHE_RESOURCE.apiTokens]);
      return created;
    },
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
      revalidateHousehold(household.id, [CACHE_RESOURCE.apiTokens]);
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
      revalidateHousehold(household.id, [
        CACHE_RESOURCE.household,
        CACHE_RESOURCE.apiTokens,
      ]);
    },
  );
}
