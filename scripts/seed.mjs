// Startdaten einspielen: Team (Allowlist), Bereiche, Meilensteine.
// Aufruf im Repo: node --env-file=.env.local scripts/seed.mjs --erzwingen
// Braucht NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SECRET_KEY in .env.local.
// ACHTUNG: Seit 16.10. pflegt das Team Roadmap und Bereiche im Tool. Das Skript überschreibt Bereiche und Meilensteine
// mit den alten Startdaten (docs/daten/meilensteine.json ist veraltet) und legt abgeschaffte Bereiche wieder an.
// Am 16.10. abends ist das einmal versehentlich passiert (aus dem Backup repariert). Nur für eine leere Test-Datenbank.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

if (!process.argv.includes("--erzwingen")) {
  console.error("Abgebrochen: würde die im Tool gepflegte Roadmap und die Bereiche überschreiben. Nur für eine leere Test-Datenbank, dann mit --erzwingen.");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL oder SUPABASE_SECRET_KEY fehlt in .env.local");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });
const readJson = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), "utf8"));

// Startstand vom 13.10. (7 Bereiche laut Excel). Umbau auf 5 Bereiche: supabase/migrations/20261014150000_bereiche_zeitplan.sql
// Bereichs-Farben laut docs/design/Design-System.md
const AREAS = [
  { id: "partner", name: "Partner", color: "#a78bfa" },
  { id: "sponsoren", name: "Sponsoren", color: "#f472b6" },
  { id: "venue", name: "Venue", color: "#2dd4bf" },
  { id: "marketing", name: "Marketing", color: "#fb923c" },
  { id: "jury", name: "Jury", color: "#facc15" },
  { id: "teilnehmer", name: "Teilnehmer", color: "#60a5fa" },
  { id: "event", name: "Event", color: "#f87171" },
  { id: "vorbereitung", name: "Vorbereitung", color: "#a1a1aa", is_project: false },
].map((a, i) => ({ is_project: true, ...a, sort: i }));

// Zeiträume (Balken in der Roadmap) laut Design-System, Abschnitt 6.2
const START_DATES = { M2: "2026-10-19", M3: "2026-10-19" };

async function upsert(table, rows, onConflict) {
  const { error } = await db.from(table).upsert(rows, { onConflict });
  if (error) throw new Error(`${table}: ${error.message}`);
  console.log(`${table}: ${rows.length} Zeilen eingespielt`);
}

const team = readJson("supabase/team.local.json").people.map((p, i) => ({
  ...p,
  email: p.email.toLowerCase(),
  sort: i,
}));
await upsert("people", team, "email");

await upsert("areas", AREAS, "id");

const areaId = Object.fromEntries(AREAS.map((a) => [a.name, a.id]));
const milestones = readJson("docs/daten/meilensteine.json").meilensteine.map((m, i) => {
  if (!areaId[m.bereich]) throw new Error(`Unbekannter Bereich: ${m.bereich}`);
  return {
    id: m.id,
    parent_id: m.parent,
    title: m.titel,
    description: m.beschreibung,
    start_date: START_DATES[m.id] ?? null,
    due_date: m.deadline,
    area_id: areaId[m.bereich],
    status: m.status,
    sort: i,
  };
});
// Eltern vor Kindern einspielen (Fremdschlüssel parent_id)
await upsert("milestones", milestones.filter((m) => !m.parent_id), "id");
await upsert("milestones", milestones.filter((m) => m.parent_id), "id");

// Kontrolle gegen die Quelle
const { count } = await db.from("milestones").select("*", { count: "exact", head: true });
console.log(`Kontrolle: ${count} Meilensteine in der Datenbank (Quelle: ${milestones.length})`);
