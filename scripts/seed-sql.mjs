// Erzeugt die Startdaten als SQL (Team, Bereiche, Meilensteine) für den SQL-Editor von Supabase.
// Aufruf im Repo: node scripts/seed-sql.mjs > supabase/seed.local.sql
// Mehrfach ausführbar (on conflict … do update). Die Ausgabe enthält die Team-Adressen → nicht committen.

import { readFileSync } from "node:fs";

const readJson = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), "utf8"));
const q = (v) => (v === null || v === undefined ? "null" : `'${String(v).replaceAll("'", "''")}'`);

// Startstand vom 13.10. (7 Bereiche laut Excel). Umbau auf 5 Bereiche: supabase/migrations/20261014150000_bereiche_zeitplan.sql
// Bereichs-Farben laut docs/design/Design-System.md
const AREAS = [
  ["partner", "Partner", "#a78bfa", true],
  ["sponsoren", "Sponsoren", "#f472b6", true],
  ["venue", "Venue", "#2dd4bf", true],
  ["marketing", "Marketing", "#fb923c", true],
  ["jury", "Jury", "#facc15", true],
  ["teilnehmer", "Teilnehmer", "#60a5fa", true],
  ["event", "Event", "#f87171", true],
  ["vorbereitung", "Vorbereitung", "#a1a1aa", false],
];
// Zeiträume (Balken in der Roadmap) laut Design-System, Abschnitt 6.2
const START_DATES = { M2: "2026-10-19", M3: "2026-10-19" };

const out = ["-- Startdaten (erzeugt von scripts/seed-sql.mjs)"];

const team = readJson("supabase/team.local.json").people;
out.push(
  "insert into public.people (name, full_name, initials, color, email, sort) values",
  team
    .map((p, i) => `  (${q(p.name)}, ${q(p.full_name)}, ${q(p.initials)}, ${q(p.color)}, ${q(p.email.toLowerCase())}, ${i})`)
    .join(",\n"),
  "on conflict (email) do update set name = excluded.name, full_name = excluded.full_name, initials = excluded.initials, color = excluded.color, sort = excluded.sort;",
  ""
);

out.push(
  "insert into public.areas (id, name, color, is_project, sort) values",
  AREAS.map(([id, name, color, isProject], i) => `  (${q(id)}, ${q(name)}, ${q(color)}, ${isProject}, ${i})`).join(",\n"),
  "on conflict (id) do update set name = excluded.name, color = excluded.color, is_project = excluded.is_project, sort = excluded.sort;",
  ""
);

const areaId = Object.fromEntries(AREAS.map(([id, name]) => [name, id]));
const ms = readJson("docs/daten/meilensteine.json").meilensteine;
// Eltern zuerst (Fremdschlüssel parent_id)
const ordered = [...ms.filter((m) => !m.parent), ...ms.filter((m) => m.parent)];
out.push(
  "insert into public.milestones (id, parent_id, title, description, start_date, due_date, area_id, status, sort) values",
  ordered
    .map((m) => {
      if (!areaId[m.bereich]) throw new Error(`Unbekannter Bereich: ${m.bereich}`);
      return `  (${q(m.id)}, ${q(m.parent)}, ${q(m.titel)}, ${q(m.beschreibung)}, ${q(START_DATES[m.id] ?? null)}, ${q(m.deadline)}, ${q(areaId[m.bereich])}, ${q(m.status)}, ${ms.indexOf(m)})`;
    })
    .join(",\n"),
  "on conflict (id) do update set parent_id = excluded.parent_id, title = excluded.title, description = excluded.description, start_date = excluded.start_date, due_date = excluded.due_date, area_id = excluded.area_id, sort = excluded.sort;",
  "",
  "-- Kontrolle: erwartet 5 Personen, 8 Bereiche, 18 Meilensteine",
  "select (select count(*) from public.people) as personen, (select count(*) from public.areas) as bereiche, (select count(*) from public.milestones) as meilensteine;"
);

console.log(out.join("\n"));
