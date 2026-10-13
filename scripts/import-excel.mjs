// Import der Partner- und Venue-Liste aus den Original-Excels im OneDrive-Ordner in die Pipeline.
// Zuordnung laut docs/daten/Partner-Liste-v1_Analyse.md und Venue-Liste-v1_Analyse.md.
// Die Excels werden nur gelesen, nie verändert. Spalten werden über die Überschrift gefunden,
// neue Spalten wie „Prio“ oder „Welle“ in Partner.xlsx werden deshalb automatisch übernommen.
//
//   node --env-file=.env.local scripts/import-excel.mjs            Trockenlauf: lesen, zuordnen, zählen, nichts schreiben
//   node --env-file=.env.local scripts/import-excel.mjs --write    schreiben und danach mit der Datenbank abgleichen
//   node --env-file=.env.local scripts/import-excel.mjs --remove   alle importierten Zeilen samt Verlauf wieder entfernen
//
// Optional: --dir <Ordner> (Standard: OneDrive-Projektordner), --partner <datei>, --venues <datei>.
// --write bricht ab, wenn schon importierte Zeilen in der Datenbank stehen oder die Excel Fehler hat.

import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { readWorkbook, excelDate } from "./lib/xlsx.mjs";

const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const DIR = arg("--dir") ?? "C:/Users/maxis/OneDrive - WU Wien/01 icons Hack PMO";
const PARTNER_FILE = arg("--partner") ?? path.join(DIR, "Partner.xlsx");
const VENUE_FILE = arg("--venues") ?? path.join(DIR, "Venue_Tracker_Hackathon_2027.xlsx");
const SRC_PARTNER = "Partner.xlsx Z. ";
const SRC_VENUE = "Venue-Tracker Z. ";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL oder SUPABASE_SECRET_KEY fehlt. Aufruf mit: node --env-file=.env.local …");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

// ---------------------------------------------------------------
// Hilfen
// ---------------------------------------------------------------
const problems = []; // blockieren --write
const hints = []; // nur zur Info

const norm = (s) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const PLACEHOLDER = /^(unklar|offen|-|–|—|\?|n\/a|tbd|k\.a\.)$/i;
const text = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "" || PLACEHOLDER.test(s) ? null : s;
};
const tally = (list) => {
  const t = {};
  for (const v of list) t[v ?? "(leer)"] = (t[v ?? "(leer)"] ?? 0) + 1;
  return Object.entries(t)
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `${k} ${n}`)
    .join(" · ");
};

/** Überschriften-Zeile finden und Spalten den Feldern zuordnen. */
function columns(rows, file, fields, ignored) {
  const headerRow = Object.keys(rows)
    .map(Number)
    .sort((a, b) => a - b)
    .slice(0, 10)
    .find((r) => Object.values(rows[r]).some((v) => fields.name.includes(norm(v))));
  if (!headerRow) throw new Error(`${file}: Überschriften-Zeile nicht gefunden`);
  const col = {};
  for (const [letter, value] of Object.entries(rows[headerRow])) {
    const h = norm(value);
    const field = Object.keys(fields).find((f) => fields[f].includes(h));
    if (field) col[field] = letter;
    else if (!ignored.includes(h)) hints.push(`${file}: Spalte ${letter} „${value}“ wird nicht übernommen`);
  }
  for (const req of ["name", "status"]) if (!col[req]) problems.push(`${file}: Spalte für „${fields[req][0]}“ fehlt`);
  return { headerRow, col };
}

function makeOwner(people) {
  const byName = Object.fromEntries(people.map((p) => [norm(p.name), p.id]));
  const alias = { maxi: "maxi s", "maxi seipl": "maxi s", "maxi dieringer": "maxi d" };
  return (raw, where) => {
    const v = norm(raw);
    if (!v) return { owner_id: null };
    if (v === "icons cooperations") return { owner_id: null, existing_contact: "icons Cooperations" };
    if (v === "beide") {
      hints.push(`${where}: Owner „Beide“ → zuständig bleibt leer`);
      return { owner_id: null };
    }
    const id = byName[alias[v] ?? v];
    if (!id) problems.push(`${where}: Owner „${raw}“ ist keine Person aus dem Team`);
    return { owner_id: id ?? null };
  };
}

function prioOf(raw, where) {
  const v = text(raw)?.toUpperCase();
  if (!v) return null;
  if (["A", "B", "C"].includes(v)) return v;
  problems.push(`${where}: Prio „${raw}“ unbekannt (erlaubt A, B, C)`);
  return null;
}

function waveOf(raw, where) {
  const m = String(raw ?? "").match(/[1-3]/);
  if (raw == null || raw === "") return null;
  if (m) return Number(m[0]);
  problems.push(`${where}: Welle „${raw}“ unbekannt (erlaubt 1–3)`);
  return null;
}

function dateOf(raw, where) {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number") return excelDate(raw);
  const m = String(raw).match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  problems.push(`${where}: Datum „${raw}“ nicht lesbar`);
  return null;
}

// ---------------------------------------------------------------
// Partner.xlsx
// ---------------------------------------------------------------
const PARTNER_STAGE = {
  "noch nicht kontaktiert": "recherche",
  kontaktiert: "kontaktiert",
  "im austausch": "im_gespraech",
  "im gespräch": "im_gespraech",
  zugesagt: "zugesagt",
  fix: "fix",
  abgesagt: "abgesagt",
};
const ROLE = { challenge: "challenge", sponsor: "sponsor", jury: "jury", tokens: "tokens", credits: "tokens" };
const CONTACT = { te: "Talent Elevator", coop: "Coop", "te & coop": "Talent Elevator + Coop" };

function readPartners(owner) {
  const wb = readWorkbook(PARTNER_FILE);
  const rows = Object.values(wb)[0];
  const file = "Partner.xlsx";
  const { headerRow, col } = columns(
    rows,
    file,
    {
      name: ["unternehmen", "firma"],
      category: ["kategorie"],
      location: ["standort"],
      type: ["type", "typ", "rolle"],
      contact: ["bestehender kontakt"],
      contact_person: ["kontaktperson", "ansprechperson"],
      contact_info: ["kontaktinfo", "kontakt info"],
      status: ["status"],
      owner: ["owner", "zuständig"],
      notes: ["notizen", "notiz"],
      prio: ["prio", "priorität"],
      wave: ["welle"],
      warm_via: ["warm über", "warmer kontakt", "kontakt über"],
    },
    []
  );
  const out = [];
  const raw = []; // Rohwerte für die Zählung gegen die Quelle
  for (const r of Object.keys(rows).map(Number).filter((r) => r > headerRow).sort((a, b) => a - b)) {
    const c = (f) => (col[f] ? rows[r][col[f]] : undefined);
    const where = `${file} Z. ${r}`;
    const name = text(c("name"));
    if (!name) {
      hints.push(`${where}: kein Firmenname, übersprungen`);
      continue;
    }
    raw.push({ r, type: c("type"), status: c("status"), contact: c("contact"), owner: c("owner"), prio: c("prio") });

    const roles = [
      ...new Set(
        String(c("type") ?? "")
          .split(/[/,+&]/)
          .map(norm)
          .filter(Boolean)
          .map((t) => ROLE[t] ?? (problems.push(`${where}: Type „${c("type")}“ unbekannt`), null))
          .filter(Boolean)
      ),
    ];
    if (!roles.length) problems.push(`${where}: Type fehlt`);

    const stage = PARTNER_STAGE[norm(c("status"))];
    if (!stage) problems.push(`${where}: Status „${c("status")}“ unbekannt`);

    const contactRaw = text(c("contact"));
    const existing = contactRaw ? CONTACT[norm(contactRaw)] ?? contactRaw : null;
    if (contactRaw && !CONTACT[norm(contactRaw)]) hints.push(`${where}: Bestehender Kontakt „${contactRaw}“ unverändert übernommen`);

    out.push({
      name,
      roles,
      category: text(c("category")),
      location: text(c("location")),
      prio: prioOf(c("prio"), where),
      wave: waveOf(c("wave"), where),
      stage: stage ?? "recherche",
      existing_contact: existing,
      warm_via: text(c("warm_via")),
      contact_person: text(c("contact_person")),
      contact_info: text(c("contact_info")),
      notes: text(c("notes")),
      ...owner(c("owner"), where),
      source: SRC_PARTNER + r,
    });
  }
  return { rows: out, raw, headerRow };
}

// ---------------------------------------------------------------
// Venue-Tracker
// ---------------------------------------------------------------
const VENUE_STAGE = {
  offen: "recherche",
  angefragt: "kontaktiert",
  "im gespräch": "im_gespraech",
  besichtigung: "im_gespraech",
  zusage: "zugesagt",
  fix: "fix",
  absage: "abgesagt",
  verworfen: "abgesagt",
};
// Klammerinhalt gilt als Lage, wenn er wie eine Adresse aussieht (PLZ, Straße + Nummer, „Am … 1“).
const ADDRESS = /\b1\d{3}\b|(str\.|straße|gasse|weg|platz|ring)\s*\d|^am\s.+\d/i;

function splitVenueName(full) {
  const m = full.match(/^(.*?)\s*\(([^)]*)\)\s*,?\s*(.*)$/);
  if (!m || !ADDRESS.test(m[2])) return { name: full, location: null, extra: null };
  return { name: m[1].trim(), location: m[2].trim(), extra: m[3].trim() || null };
}

function readVenues(owner) {
  const wb = readWorkbook(VENUE_FILE);
  const rows = wb["Venue Tracker"] ?? Object.values(wb)[0];
  const file = "Venue-Tracker";
  const { headerRow, col } = columns(
    rows,
    file,
    {
      name: ["venue"],
      prio: ["prio"],
      owner: ["owner", "zuständig"],
      status: ["status"],
      deadline: ["deadline"],
      capacity: ["kapazität"],
      overnight: ["übernachtung"],
      price: ["kosten / deal", "kosten"],
      contact_info: ["kontakt"],
      url: ["url", "link"],
      notes: ["kommentar / nächster schritt", "kommentar"],
    },
    ["bucket", "nutzung"] // bewusst nicht übernommen (Entscheidung 13.10.)
  );
  const all = Object.keys(rows)
    .map(Number)
    .filter((r) => r > headerRow && text(rows[r][col.name]))
    .sort((a, b) => a - b);
  const names = all.map((r) => ({ r, n: norm(rows[r][col.name]), filled: Object.keys(rows[r]).length }));

  const out = [];
  const raw = [];
  for (const r of all) {
    const c = (f) => (col[f] ? rows[r][col[f]] : undefined);
    const where = `${file} Z. ${r}`;
    const full = text(c("name"));
    // Duplikat: Name steckt in einer anderen Venue mit mehr Angaben (z. B. „TUtheSky“ in „TU Wien (… TUtheSky …)“)
    const me = names.find((x) => x.r === r);
    const dup = names.find((x) => x.r !== r && (x.n === me.n ? x.r < r : x.n.includes(me.n) && x.filled > me.filled));
    if (dup) {
      hints.push(`${where}: „${full}“ ist ein Duplikat von Z. ${dup.r}, übersprungen`);
      continue;
    }
    raw.push({ r, status: c("status"), owner: c("owner"), prio: c("prio"), deadline: c("deadline") });

    const statusKey = norm(c("status"));
    const stage = VENUE_STAGE[statusKey];
    if (!stage) problems.push(`${where}: Status „${c("status")}“ unbekannt`);
    const { name, location, extra } = splitVenueName(full);
    const notes = [extra, text(c("notes"))].filter(Boolean).join("\n") || null;
    const own = owner(c("owner"), where);

    out.push({
      name,
      roles: ["venue"],
      location,
      prio: prioOf(c("prio"), where),
      stage: stage ?? "recherche",
      lost_reason: statusKey === "verworfen" ? "verworfen" : null,
      next_follow_up: stage === "abgesagt" ? null : dateOf(c("deadline"), where),
      capacity: text(c("capacity")),
      overnight: text(c("overnight")),
      price: text(c("price")),
      contact_info: text(c("contact_info")),
      url: text(c("url")),
      notes,
      owner_id: own.owner_id,
      existing_contact: own.existing_contact ?? null,
      source: SRC_VENUE + r,
    });
  }
  return { rows: out, raw, headerRow };
}

// ---------------------------------------------------------------
// Ablauf
// ---------------------------------------------------------------
async function importedRows(select = "id") {
  const { data, error } = await db
    .from("organizations")
    .select(select)
    .or(`source.like.${SRC_PARTNER}%,source.like.${SRC_VENUE}%`);
  if (error) throw error;
  return data;
}

async function remove() {
  const ids = (await importedRows()).map((r) => r.id);
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    for (const table of ["notifications", "comments", "activity"]) {
      const { error } = await db.from(table).delete().eq("target_type", "organization").in("target_id", chunk);
      if (error) throw new Error(`${table}: ${error.message}`);
    }
    const { error } = await db.from("organizations").delete().in("id", chunk);
    if (error) throw error;
  }
  console.log(`Importierte Zeilen entfernt: ${ids.length}`);
}

if (args.includes("--remove")) {
  await remove();
  process.exit(0);
}

const { data: people, error: pErr } = await db.from("people").select("id, name");
if (pErr) throw pErr;
const personName = Object.fromEntries(people.map((p) => [p.id, p.name]));
const owner = makeOwner(people);

let partners, venues;
try {
  partners = readPartners(owner);
  venues = readVenues(owner);
} catch (e) {
  if (e.code === "EBUSY") console.error("Excel ist gerade geöffnet und gesperrt. Bitte schließen und nochmal starten.");
  else console.error(e.message);
  process.exit(1);
}
const all = [...partners.rows, ...venues.rows];

// Doppelte Namen innerhalb der Partner-Liste und gegenüber bestehenden Einträgen (ohne frühere Importe)
const seen = new Map();
for (const o of partners.rows) {
  const k = norm(o.name);
  if (seen.has(k)) problems.push(`Partner.xlsx: „${o.name}“ steht doppelt (${seen.get(k)} und ${o.source})`);
  else seen.set(k, o.source);
}
const { data: existing } = await db.from("organizations").select("name, source");
const existingOther = existing.filter((e) => !e.source?.startsWith(SRC_PARTNER) && !e.source?.startsWith(SRC_VENUE));
for (const o of all) {
  const hit = existingOther.find((e) => norm(e.name) === norm(o.name));
  if (hit) hints.push(`„${o.name}“ steht schon in der Pipeline (Quelle ${hit.source ?? "von Hand"}), wird trotzdem angelegt`);
}

// ---------------------------------------------------------------
// Bericht: Quelle gegen Zuordnung
// ---------------------------------------------------------------
const STAGE_NAME = { recherche: "Recherche", kontaktiert: "Kontaktiert", im_gespraech: "Im Gespräch", zugesagt: "Zugesagt", fix: "Fix", abgesagt: "Abgesagt" };
const p = partners.rows;
const v = venues.rows;
const line = (label, src, tool) => console.log(`  ${label.padEnd(18)} Excel: ${src}\n  ${"".padEnd(18)} Tool:  ${tool}`);

console.log(`\nPartner.xlsx: ${partners.raw.length} Firmen gelesen (Z. ${partners.headerRow + 1}–${Math.max(...partners.raw.map((x) => x.r))}), ${p.length} zum Import`);
line("Type → Rollen", tally(partners.raw.map((x) => x.type)), tally(p.map((o) => o.roles.join("+"))));
line("Status → Stufe", tally(partners.raw.map((x) => x.status)), tally(p.map((o) => STAGE_NAME[o.stage])));
line("Kontakt", tally(partners.raw.map((x) => x.contact)), tally(p.map((o) => o.existing_contact)));
line("Owner → zuständig", tally(partners.raw.map((x) => x.owner)), tally(p.map((o) => personName[o.owner_id])));
line("Prio", tally(partners.raw.map((x) => x.prio)), tally(p.map((o) => o.prio)));
console.log(`  Kategorie: ${tally(p.map((o) => o.category))}`);
console.log(`  Standort:  ${tally(p.map((o) => o.location))}`);
console.log(`  Notizen:   ${p.filter((o) => o.notes).length} befüllt`);

console.log(`\nVenue-Tracker: ${venues.raw.length} Venues zum Import (Z. ${Math.min(...venues.raw.map((x) => x.r))}–${Math.max(...venues.raw.map((x) => x.r))})`);
line("Status → Stufe", tally(venues.raw.map((x) => x.status)), tally(v.map((o) => STAGE_NAME[o.stage])));
line("Owner → zuständig", tally(venues.raw.map((x) => x.owner)), tally(v.map((o) => personName[o.owner_id] ?? o.existing_contact)));
line("Prio", tally(venues.raw.map((x) => x.prio)), tally(v.map((o) => o.prio)));
line("Deadline → Nachf.", tally(venues.raw.map((x) => x.deadline)), tally(v.map((o) => o.next_follow_up)));
console.log("  Name und Lage getrennt:");
for (const o of v.filter((o) => o.location)) console.log(`    ${o.name}  |  Lage: ${o.location}`);
console.log(`  Kapazität ${v.filter((o) => o.capacity).length} · Übernachtung ${v.filter((o) => o.overnight).length} · Preis ${v.filter((o) => o.price).length} · Kontakt ${v.filter((o) => o.contact_info).length} · Link ${v.filter((o) => o.url).length} · Notiz ${v.filter((o) => o.notes).length} befüllt (Platzhalter wie „Unklar“ → leer)`);

if (hints.length) console.log(`\nHinweise (${hints.length}):\n  ` + hints.join("\n  "));
if (problems.length) console.log(`\nFEHLER (${problems.length}), Import nicht möglich:\n  ` + problems.join("\n  "));
console.log(`\nGesamt: ${all.length} Einträge (${p.length} Partner + ${v.length} Venues)`);

if (!args.includes("--write")) {
  console.log("Trockenlauf: nichts geschrieben. Zum Schreiben: --write");
  process.exit(problems.length ? 1 : 0);
}

// ---------------------------------------------------------------
// Schreiben und Abgleich
// ---------------------------------------------------------------
if (problems.length) process.exit(1);
const already = await importedRows();
if (already.length) {
  console.error(`Abbruch: ${already.length} importierte Zeilen stehen schon in der Datenbank. Erst --remove (löscht auch Änderungen daran).`);
  process.exit(1);
}

const actor = people.find((x) => x.name === "Maxi S")?.id ?? null;
const inserted = [];
for (let i = 0; i < all.length; i += 50) {
  const { data, error } = await db.from("organizations").insert(all.slice(i, i + 50)).select("id, source");
  if (error) throw error;
  inserted.push(...data);
}
const { error: aErr } = await db.from("activity").insert(
  inserted.map((r) => ({
    target_type: "organization",
    target_id: r.id,
    actor_id: actor,
    action: "imported",
    data: { source: r.source },
  }))
);
if (aErr) throw aErr;
console.log(`\nGeschrieben: ${inserted.length} Einträge, ${inserted.length} Verlaufseinträge „importiert“`);

// Abgleich: jede Zeile aus der Datenbank zurücklesen und Feld für Feld mit der Zuordnung vergleichen
const back = await importedRows("*");
const bySource = Object.fromEntries(back.map((r) => [r.source, r]));
let ok = 0;
const diffs = [];
for (const o of all) {
  const row = bySource[o.source];
  if (!row) {
    diffs.push(`${o.source}: fehlt in der Datenbank`);
    continue;
  }
  const bad = Object.keys(o).filter((k) => JSON.stringify(row[k] ?? null) !== JSON.stringify(o[k] ?? null));
  if (bad.length) diffs.push(`${o.source}: ${bad.join(", ")} weicht ab`);
  else ok++;
}
console.log(`Abgleich: ${ok} von ${all.length} Einträgen stimmen in allen Feldern, ${back.length} importierte Zeilen in der Datenbank`);
if (diffs.length) console.log("  " + diffs.join("\n  "));
