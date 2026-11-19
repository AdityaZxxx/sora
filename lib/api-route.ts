import type { HouseholdActionContext } from "@/lib/action-result";
import type { z } from "zod";

import { createHash } from "node:crypto";

import { resolveDateRange } from "@/lib/dates";
import { DomainError } from "@/lib/errors";
import { requireHousehold } from "@/lib/household";
import { rejection, unauthorized } from "@/lib/http-error";

export { rejection, unauthorized } from "@/lib/http-error";

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

export function jsonReadResponse<T>(request: Request, data: T): Response {
  const body = JSON.stringify(data);
  const etag = `"${createHash("sha256").update(body).digest("base64url")}"`;
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "private, no-cache",
    ETag: etag,
  };
  const ifNoneMatch = request.headers
    .get("if-none-match")
    ?.split(",")
    .map((value) => value.trim());
  if (ifNoneMatch?.includes(etag)) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(body, { headers });
}
