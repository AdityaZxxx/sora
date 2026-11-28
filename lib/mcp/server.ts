import type { McpContext } from "./context";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { tokenAllowsWrite } from "@/lib/roles";

import { registerReadTools } from "./read-tools";
import { registerWriteTools } from "./write-tools";

// The SDK allows one transport per server instance, so every request builds
// its own.
export function createMcpServer(context: McpContext) {
  const server = new McpServer({
    name: "sora",
    version: "1.0.0",
  });

  registerReadTools(server, context);

  if (tokenAllowsWrite(context.scope)) {
    registerWriteTools(server, context);
  }

  return server;
}
