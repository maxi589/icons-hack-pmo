// Testfirmen für die Pipeline, bis der echte Import (27.–29.10.) die Listen bringt.
// Alle Namen beginnen mit „Test · “, Quelle = TEST. Erfundene Firmen, keine echten Daten.
//
//   node --env-file=.env.local scripts/test-pipeline.mjs          anlegen (vorher alte Testdaten weg)
//   node --env-file=.env.local scripts/test-pipeline.mjs --remove nur entfernen
//
// Entfernen löscht ausschließlich Zeilen mit source = 'TEST' und deren Verlauf, Kommentare und Inbox-Einträge.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL oder SUPABASE_SECRET_KEY fehlt in .env.local");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const day = (offset) => {
  const d = new Date(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Vienna" }).format(new Date()) + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};

async function remove() {
  const { data: rows, error } = await db.from("organizations").select("id").eq("source", "TEST");
  if (error) throw error;
  const ids = rows.map((r) => r.id);
  if (ids.length) {
    // Aufgaben der Testfirmen (z. B. Standard-Aufgaben nach „Zugesagt“) mit entfernen, sonst blieben sie ohne Firma übrig
    const { data: tasks, error: te } = await db.from("tasks").select("id").in("organization_id", ids);
    if (te) throw te;
    const taskIds = tasks.map((t) => t.id);
    if (taskIds.length) {
      for (const table of ["notifications", "comments", "activity"]) {
        const { error: e } = await db.from(table).delete().eq("target_type", "task").in("target_id", taskIds);
        if (e) throw new Error(`${table}: ${e.message}`);
      }
      const { error: e } = await db.from("tasks").delete().in("id", taskIds);
      if (e) throw e;
    }
    for (const table of ["notifications", "comments", "activity"]) {
      const { error: e } = await db.from(table).delete().eq("target_type", "organization").in("target_id", ids);
      if (e) throw new Error(`${table}: ${e.message}`);
    }
    const { error: e } = await db.from("organizations").delete().eq("source", "TEST");
    if (e) throw e;
  }
  console.log(`Testfirmen entfernt: ${ids.length}`);
}

async function add() {
  const { data: people } = await db.from("people").select("id, name");
  const who = (name) => people.find((p) => p.name === name)?.id ?? null;
  const rows = [
    { name: "Nordwerk Analytics", roles: ["challenge"], prio: "A", wave: 1, stage: "kontaktiert", warm_via: "Kilian", next_follow_up: day(0), owner_id: who("Maxi D"), contact_person: "Head of Data" },
    { name: "Donau Mobility", roles: ["challenge"], prio: "A", wave: 1, stage: "kontaktiert", next_follow_up: day(0), owner_id: who("Maxi S"), contact_person: "Innovation Lead" },
    { name: "Hafenblick Versicherung", roles: ["challenge"], prio: "A", wave: 1, stage: "kontaktiert", warm_via: "Tim", next_follow_up: day(-3), owner_id: who("Tim") },
    { name: "Alpenlicht Bank", roles: ["challenge", "sponsor"], prio: "A", wave: 1, stage: "im_gespraech", warm_via: "Manu", next_follow_up: day(9), owner_id: who("Manu"), existing_contact: "Talent Elevator" },
    { name: "Praterstern Ventures", roles: ["challenge", "jury"], prio: "A", wave: 1, stage: "zugesagt", warm_via: "Tim", owner_id: who("Tim") },
    { name: "Kessel Robotics", roles: ["challenge"], prio: "B", wave: 2, stage: "recherche", next_follow_up: day(20), owner_id: who("Tim") },
    { name: "Graukopf Software", roles: ["challenge"], prio: "B", wave: 2, stage: "recherche", warm_via: "Manu", existing_contact: "Coop" },
    { name: "Lindgrün Foods", roles: ["sponsor"], prio: "B", wave: 3, stage: "abgesagt", owner_id: who("Maxi S"), lost_reason: "Kein Budget 2027" },
    { name: "Wolkenwerk Cloud", roles: ["tokens"], stage: "recherche" },
    { name: "Campus Halle Süd", roles: ["venue"], prio: "A", stage: "kontaktiert", next_follow_up: day(1), owner_id: who("Tim"), capacity: "150 Personen", overnight: "Ja (24h offen)", location: "Musterstraße 1, 1040" },
  ].map((r) => ({ ...r, name: `Test · ${r.name}`, source: "TEST" }));

  const { error } = await db.from("organizations").insert(rows);
  if (error) throw error;
  console.log(`Testfirmen angelegt: ${rows.length}`);
}

await remove();
if (!process.argv.includes("--remove")) await add();
