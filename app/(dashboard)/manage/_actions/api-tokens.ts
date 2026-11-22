"use server";

import type {
  CreateApiTokenSchemaType,
  RevokeApiTokenSchemaType,
  SetAgentAccessSchemaType,
} from "@/schemas/api-tokens";

import { type ActionResult, withHouseholdAction } from "@/lib/action-result";
import {
  createApiToken as createApiTokenSeam,
  revokeApiToken as revokeApiTokenSeam,
  setAgentAccess as setAgentAccessSeam,
} from "@/lib/api-token";
import { CACHE_RESOURCE, revalidateHousehold } from "@/lib/cache";

export async function createApiToken(
  form: CreateApiTokenSchemaType,
): Promise<ActionResult<{ id: string; token: string }>> {
  return withHouseholdAction(
    "Unable to create the token. Check the details and try again.",
    async ({ caller }) => {
      const created = await createApiTokenSeam(caller, form);
      revalidateHousehold(caller.householdId, [CACHE_RESOURCE.apiTokens]);
      return created;
    },
  );
}

export async function revokeApiToken(
  form: RevokeApiTokenSchemaType,
): Promise<ActionResult> {
  return withHouseholdAction(
    "Unable to revoke the token. Try again.",
    async ({ caller }) => {
      await revokeApiTokenSeam(caller, form);
      revalidateHousehold(caller.householdId, [CACHE_RESOURCE.apiTokens]);
    },
  );
}

export async function setAgentAccess(
  form: SetAgentAccessSchemaType,
): Promise<ActionResult> {
  return withHouseholdAction(
    "Unable to change agent access. Try again.",
    async ({ caller }) => {
      await setAgentAccessSeam(caller, form.enabled);
      revalidateHousehold(caller.householdId, [
        CACHE_RESOURCE.household,
        CACHE_RESOURCE.apiTokens,
      ]);
    },
  );
}
