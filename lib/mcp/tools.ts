import type { McpContext } from "./context";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { z } from "zod";

import { DEFAULT_CURRENCY } from "@/lib/constants";
import { DomainError } from "@/lib/errors";

export type ToolPayload =
  | string
  | number
  | boolean
  | null
  | ToolPayload[]
  | { [key: string]: ToolPayload };

type ToolKind = "read" | "write";
type ToolRecord = { [key: string]: ToolPayload };

function withEnvelope(
  data: ToolRecord,
  context: McpContext,
  kind: ToolKind,
): ToolRecord {
  return {
    ...data,
    currency: context.currency ?? DEFAULT_CURRENCY,
    ...(kind === "write" && { memberId: context.userId }),
  };
}

// No tool declares an output schema, so the SDK never expects
// structuredContent and the payload rides in the text block.
function toolResult(data: ToolRecord): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

function toolError(message: string): CallToolResult {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

function toolErrorMessage(cause: unknown): string {
  return cause instanceof DomainError
    ? cause.message
    : "Something went wrong. Try again.";
}

export async function runTool(
  context: McpContext,
  kind: ToolKind,
  handler: () => ToolRecord | Promise<ToolRecord>,
): Promise<CallToolResult> {
  try {
    return toolResult(withEnvelope(await handler(), context, kind));
  } catch (cause) {
    return toolError(toolErrorMessage(cause));
  }
}

export const dateRangeSchema = {
  from: z
    .string()
    .optional()
    .describe("Start date as YYYY-MM-DD. Defaults to the start of the month."),
  to: z
    .string()
    .optional()
    .describe("End date as YYYY-MM-DD. Defaults to today."),
};
