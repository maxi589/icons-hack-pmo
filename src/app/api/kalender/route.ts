import { after, connection } from "next/server";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { calendarConfigured, runSync } from "@/lib/google-calendar";

// Kalender-Sync (17.10.): Die Datenbank ruft diese Adresse nach jeder Änderung an Terminen oder Meilensteinen auf
// (Trigger in supabase/migrations/20261017120000_kalender.sql). Ohne Anmeldung erreichbar (PUBLIC_PATHS in
// src/proxy.ts), darum nur mit dem Geheimnis aus dem Vault, geprüft per kalender_secret_ok. Antwortet sofort und
// gleicht danach ab (after), damit die Datenbank nicht wartet. Die Antwort enthält nie Daten.
// Lokal testen: KALENDER_LOKAL=1 in .env.local erlaubt Aufrufe von localhost ohne Geheimnis.

export const maxDuration = 60;

export async function POST() {
  await connection();
  const h = await headers();
  const local = process.env.KALENDER_LOKAL === "1" && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(h.get("host") ?? "");
  if (!local) {
    const token = h.get("x-hq-secret");
    if (!token) return Response.json({ ok: false }, { status: 401 });
    const { data, error } = await createAdminClient().rpc("kalender_secret_ok", { token });
    if (error || data !== true) return Response.json({ ok: false }, { status: 401 });
  }
  if (!calendarConfigured()) return Response.json({ ok: false }, { status: 503 });
  after(async () => {
    try {
      console.log("Kalender abgeglichen", await runSync());
    } catch (e) {
      console.error("Kalender-Abgleich fehlgeschlagen:", e instanceof Error ? e.message : e);
    }
  });
  return Response.json({ ok: true }, { status: 202 });
}
