"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { newToken } from "@/lib/mcp/token";

// Profil → „KI verbinden“: eigene MCP-Schlüssel anlegen, auflisten, widerrufen. Nur für die angemeldete Person,
// über den Secret Key (die Tabelle mcp_tokens ist für Clients gesperrt). Den Schlüssel gibt es nur einmal im Klartext.

export type McpToken = { id: string; name: string; kennung: string; created_at: string; last_used_at: string | null };
type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function myPersonId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: p } = await createAdminClient().from("people").select("id").eq("user_id", data.user.id).maybeSingle();
  return p?.id ?? null;
}

export async function listMcpTokens(): Promise<Result<McpToken[]>> {
  const me = await myPersonId();
  if (!me) return { ok: false, error: "Bitte neu anmelden." };
  const { data, error } = await createAdminClient()
    .from("mcp_tokens")
    .select("id, name, kennung, created_at, last_used_at")
    .eq("person_id", me)
    .is("revoked_at", null)
    .order("created_at");
  if (error) return { ok: false, error: "Konnte nicht laden." };
  return { ok: true, data: data ?? [] };
}

export async function createMcpToken(rawName: string): Promise<Result<{ token: string }>> {
  const name = rawName.trim().replace(/\s+/g, " ").slice(0, 40) || "KI";
  const me = await myPersonId();
  if (!me) return { ok: false, error: "Bitte neu anmelden." };
  const db = createAdminClient();
  const { count } = await db.from("mcp_tokens").select("id", { count: "exact", head: true }).eq("person_id", me).is("revoked_at", null);
  if ((count ?? 0) >= 10) return { ok: false, error: "Höchstens 10 Schlüssel. Widerrufe einen alten." };
  const t = newToken();
  const { error } = await db.from("mcp_tokens").insert({ person_id: me, name, hash: t.hash, kennung: t.kennung });
  if (error) return { ok: false, error: "Hat nicht geklappt. Bitte nochmal versuchen." };
  return { ok: true, data: { token: t.token } };
}

export async function revokeMcpToken(id: string): Promise<Result<null>> {
  const me = await myPersonId();
  if (!me) return { ok: false, error: "Bitte neu anmelden." };
  const { data, error } = await createAdminClient()
    .from("mcp_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("person_id", me)
    .select("id");
  if (error || !data?.length) return { ok: false, error: "Hat nicht geklappt." };
  return { ok: true, data: null };
}
