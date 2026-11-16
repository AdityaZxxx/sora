import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { rejection } from "@/lib/api-route";
import { requireToken } from "@/lib/api-token";
import { READ_ONLY_SCOPE } from "@/lib/constants";
import { contextFromToken } from "@/lib/mcp/context";
import { createMcpServer } from "@/lib/mcp/server";

// Wildcard origin is safe because auth is header-based and no cookie is set,
// so no ambient session can ride.
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, mcp-session-id, mcp-protocol-version, Last-Event-ID",
  "Access-Control-Expose-Headers": "mcp-session-id, mcp-protocol-version",
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// Session management is off because a serverless invocation cannot hold state
// between calls.
export async function POST(request: Request) {
  const auth = await requireToken(READ_ONLY_SCOPE);

  if (!auth.ok) {
    return rejection(auth.error, auth.status, CORS_HEADERS);
  }

  const server = createMcpServer(contextFromToken(auth));
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    // JSON avoids the SSE keep-alive that would hold the invocation open.
    enableJsonResponse: true,
  });

  await server.connect(transport);

  try {
    const response = await transport.handleRequest(request);
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(CORS_HEADERS)) {
      headers.set(key, value);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } finally {
    await transport.close();
    await server.close();
  }
}
