import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// MCP-Schlüssel: „hv_“ plus 32 Zufallszeichen. In der Datenbank nur der SHA-256-Hash und die letzten 4 Zeichen.
// Ohne gültigen, nicht widerrufenen Schlüssel gibt es keine Daten.

export const TOKEN_RE = /^hv_[A-Za-z0-9_-]{30,}$/;

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function newToken() {
  const token = `hv_${randomBytes(24).toString("base64url")}`;
  return { token, hash: hashToken(token), kennung: token.slice(-4) };
}

export type TokenPerson = { personId: string; name: string; tokenName: string };

/** Prüft „Bearer <Schlüssel>“. Gibt Person und Schlüssel-Namen zurück oder null. */
export async function checkToken(header: string | null): Promise<TokenPerson | null> {
  const m = /^Bearer\s+(\S+)\s*$/.exec(header ?? "");
  if (!m || !TOKEN_RE.test(m[1])) return null;
  const db = createAdminClient();
  const { data } = await db
    .from("mcp_tokens")
    .select("id, name, person_id, people(name)")
    .eq("hash", hashToken(m[1]))
    .is("revoked_at", null)
    .maybeSingle();
  if (!data) return null;
  await db.from("mcp_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  const person = data.people as unknown as { name: string } | null;
  return { personId: data.person_id, name: person?.name ?? "?", tokenName: data.name };
}
