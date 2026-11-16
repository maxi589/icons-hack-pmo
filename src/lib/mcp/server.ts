import "server-only";
import { checkToken } from "./token";
import { InputError, TOOLS, type Ctx } from "./tools";
import { INSTRUCTIONS } from "./texts";

// MCP-Schnittstelle (Model Context Protocol, „Streamable HTTP“ ohne Sitzung, Muster aus Karriere HQ): KI-Agenten
// rufen hier Werkzeuge auf. Zwei Wege zum Schlüssel, in der Datenbank steht nur der Hash (Tabelle mcp_tokens):
//   /api/mcp              mit Header „Authorization: Bearer <Schlüssel>“ (Claude Code)
//   /api/mcp/<Schlüssel>  Schlüssel in der Adresse (claude.ai, ChatGPT: die Formulare kennen keine Header)
// Ohne gültigen Schlüssel 401 ohne Daten.

const PROTOCOLS = ["2025-06-18", "2025-03-26", "2024-11-05"];

type Rpc = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };
const ok = (id: Rpc["id"], result: unknown) => ({ jsonrpc: "2.0", id, result });
const fail = (id: Rpc["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

async function handle(m: Rpc, ctx: Ctx) {
  const id = m.id;
  switch (m.method) {
    case "initialize": {
      const asked = String(m.params?.protocolVersion ?? "");
      return ok(id, {
        protocolVersion: PROTOCOLS.includes(asked) ? asked : PROTOCOLS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "hack-vienna-hq", title: "hack-vienna HQ", version: "1.0.0" },
        instructions: INSTRUCTIONS,
      });
    }
    case "ping":
      return ok(id, {});
    case "tools/list":
      return ok(id, { tools: TOOLS.map(({ name, description, inputSchema, annotations }) => ({ name, description, inputSchema, annotations })) });
    case "tools/call": {
      const name = String(m.params?.name ?? "");
      const tool = TOOLS.find((t) => t.name === name);
      if (!tool) return fail(id, -32602, `Unbekanntes Werkzeug: ${name}`);
      try {
        const result = await tool.run((m.params?.arguments as Record<string, unknown>) ?? {}, ctx);
        return ok(id, { content: [{ type: "text", text: JSON.stringify(result, null, 1) }] });
      } catch (e) {
        // Eingabefehler sieht der Agent als Ergebnis und kann ihn selbst korrigieren; sonst ohne Einzelheiten
        const text = e instanceof InputError ? e.message : "Fehler beim Ausführen. Bitte erneut versuchen.";
        if (!(e instanceof InputError)) console.error("MCP", name, e);
        return ok(id, { content: [{ type: "text", text }], isError: true });
      }
    }
    default:
      return fail(id, -32601, `Unbekannte Methode: ${m.method}`);
  }
}

/** Beantwortet eine MCP-Anfrage. authorization: „Bearer <Schlüssel>“ aus Header oder Adresse. */
export async function mcpResponse(request: Request, authorization: string | null) {
  const t = await checkToken(authorization).catch(() => null);
  if (!t) {
    return Response.json(fail(null, -32001, "Nicht angemeldet"), { status: 401, headers: { "WWW-Authenticate": 'Bearer realm="hack-vienna-hq"' } });
  }
  const ctx: Ctx = { me: { id: t.personId, name: t.name }, tokenName: t.tokenName };
  const body = (await request.json().catch(() => null)) as Rpc | Rpc[] | null;
  if (!body) return Response.json(fail(null, -32700, "Ungültiges JSON"), { status: 400 });
  const list = Array.isArray(body) ? body : [body];
  const out = [];
  for (const m of list) {
    if (!m || typeof m !== "object") {
      out.push(fail(null, -32600, "Ungültige Anfrage"));
      continue;
    }
    // Benachrichtigung (z. B. notifications/initialized): keine Antwort
    if (m.id === undefined || m.id === null || !m.method) continue;
    out.push(await handle(m, ctx));
  }
  if (!out.length) return new Response(null, { status: 202 });
  return Response.json(Array.isArray(body) ? out : out[0], { headers: { "Cache-Control": "no-store" } });
}

/** Kein Server-Stream: Agenten sprechen nur per POST */
export function postOnly() {
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}
