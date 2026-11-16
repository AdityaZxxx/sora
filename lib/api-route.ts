import type { HouseholdActionContext } from "@/lib/action-result";
import type { z } from "zod";

import { resolveDateRange } from "@/lib/dates";
import { DomainError } from "@/lib/errors";
import { requireHousehold } from "@/lib/household";

export function rejection(
  message: string,
  status: number,
  headers?: HeadersInit,
): Response {
  return Response.json({ message }, { status, headers });
}

export function unauthorized(headers?: HeadersInit): Response {
  return rejection("Unauthorized", 401, headers);
}

type QueryInput = { [key: string]: string | null | undefined };

export function parseQueryParams<TSchema extends z.ZodType>(
  schema: TSchema,
  input: QueryInput,
): z.output<TSchema> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError(parsed.error.issues[0]?.message ?? "Invalid request");
  }
  return parsed.data;
}

export async function withHouseholdRoute(
  handler: (context: HouseholdActionContext) => Promise<Response> | Response,
): Promise<Response> {
  const result = await requireHousehold();
  if (!result) {
    return unauthorized();
  }

  try {
    return await handler(result);
  } catch (cause) {
    if (cause instanceof DomainError) {
      return rejection(cause.message, 400);
    }
    throw cause;
  }
}

export function dateRangeFromParams(searchParams: URLSearchParams) {
  return resolveDateRange(
    searchParams.get("from") ?? undefined,
    searchParams.get("to") ?? undefined,
  );
}
