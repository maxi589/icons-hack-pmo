import { mcpResponse, postOnly } from "@/lib/mcp/server";
import { TOKEN_RE } from "@/lib/mcp/token";

// MCP für claude.ai und ChatGPT: Schlüssel in der Adresse (/api/mcp/<Schlüssel>), weil deren Formular keine Header kennt.
// Gleiche Prüfung wie mit Header: nur der Hash steht in der Datenbank, widerrufbar im Profil.
export async function POST(request: Request, ctx: RouteContext<"/api/mcp/[token]">) {
  const { token } = await ctx.params;
  return mcpResponse(request, TOKEN_RE.test(token) ? `Bearer ${token}` : null);
}
export const GET = postOnly;
export const DELETE = postOnly;
