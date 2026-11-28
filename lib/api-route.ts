import type { WalletActionContext } from "@/lib/action-result";
import type { z } from "zod";

import { resolveDateRange } from "@/lib/dates";
import { DomainError } from "@/lib/errors";
import { rejection, unauthorized } from "@/lib/http-error";
import { withWalletTransport } from "@/lib/wallet-transport";

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

export async function withWalletRoute(
  handler: (context: WalletActionContext) => Promise<Response> | Response,
): Promise<Response> {
  return withWalletTransport<Response, Response>(
    {
      events: {
        unauthorized: "route.unauthorized",
        completed: "route.completed",
        rejected: "route.rejected",
        failed: "route.failed",
      },
      unauthorized: () => unauthorized(),
      success: (response) => response,
      successLogFields: (response) => ({ status: response.status }),
      domainError: (cause) => ({
        message: cause.message,
        result: rejection(cause.message, 400),
      }),
    },
    handler,
  );
}

export function dateRangeFromParams(searchParams: URLSearchParams) {
  return resolveDateRange(
    searchParams.get("from") ?? undefined,
    searchParams.get("to") ?? undefined,
  );
}

export function jsonReadResponse<T>(_request: Request, data: T): Response {
  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, no-cache",
    },
  });
}
