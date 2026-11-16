import { mcpResponse, postOnly } from "@/lib/mcp/server";

// MCP für Claude Code: Schlüssel im Header „Authorization: Bearer <Schlüssel>“. Logik in src/lib/mcp/server.ts.
export function POST(request: Request) {
  return mcpResponse(request, request.headers.get("authorization"));
}
export const GET = postOnly;
export const DELETE = postOnly;
