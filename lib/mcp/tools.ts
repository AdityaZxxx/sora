import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { z } from "zod";

import { DomainError } from "@/lib/errors";

export type ToolPayload =
  | string
  | number
  | boolean
  | null
  | ToolPayload[]
  | { [key: string]: ToolPayload };

// No tool declares an output schema, so the SDK never expects
// structuredContent and the payload rides in the text block.
export function toolResult(data: ToolPayload): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

export function toolError(message: string): CallToolResult {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

export async function runWriteTool(
  action: () => ToolPayload | Promise<ToolPayload>,
): Promise<CallToolResult> {
  try {
    return toolResult(await action());
  } catch (cause) {
    return toolError(toolErrorMessage(cause));
  }
}

export function toolErrorMessage(cause: unknown): string {
  return cause instanceof DomainError
    ? cause.message
    : "Something went wrong. Try again.";
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
