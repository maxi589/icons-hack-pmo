import { after, connection } from "next/server";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { calendarConfigured, runSync } from "@/lib/google-calendar";

// Wachhalten (16.10.): Supabase Free pausiert Projekte nach 1 Woche ohne Nutzung (supabase.com/pricing, gelesen 16.10.).
// Vercel ruft diese Adresse täglich auf (Cron in vercel.json, Hobby: 1×/Tag, ±59 min) und macht damit eine echte,
// winzige Abfrage (nur die Anzahl der Meilensteine). Mit dem öffentlichen Schlüssel würde die Datenbank sie ablehnen
// (gemessen: 401), darum serverseitig mit dem geheimen Schlüssel. Ohne Anmeldung erreichbar (PUBLIC_PATHS in
// src/proxy.ts), deshalb gibt die Antwort nie Daten zurück, nur „ok“.
// Optional CRON_SECRET (Vercel-Umgebungsvariable, Vercel schickt sie beim Cron als „Authorization: Bearer …“ mit):
// ist sie gesetzt, antwortet die Route nur noch dem Cron. Ohne sie läuft der Ping wie bisher für alle.
// Kalender-Sync (17.10.): Nach der Antwort einmal alles mit Google abgleichen, inkl. Freigaben (Sicherheitsnetz,
// falls eine Meldung der Datenbank verloren ging). Höchstens alle 20 h (Sperre in kalender_sync), auch wenn jemand die
// Adresse öfter aufruft. Fehler dort ändern die Antwort des Pings nicht.

export const maxDuration = 60;

export async function GET() {
  await connection(); // immer zur Laufzeit, nie beim Build vorab
  const secret = process.env.CRON_SECRET;
  if (secret && (await headers()).get("authorization") !== `Bearer ${secret}`) return Response.json({ ok: false }, { status: 401 });
  const { error } = await createAdminClient().from("milestones").select("id", { head: true, count: "exact" });
  if (calendarConfigured())
    after(() =>
      runSync(true).then(
        (r) => console.log("Kalender abgeglichen (täglich)", r),
        (e) => console.error("Kalender-Abgleich fehlgeschlagen:", e instanceof Error ? e.message : e)
      )
    );
  return Response.json({ ok: !error }, { status: error ? 502 : 200 });
}
