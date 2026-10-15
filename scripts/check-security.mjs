// Sicherheits-Check von außen, nur mit dem öffentlichen Schlüssel (wie ein Fremder im Browser).
// Aufruf im Repo: node --env-file=.env.local scripts/check-security.mjs
// Erwartung: keine Daten ohne Anmeldung, nichts beschreibbar, Speicher zu, keine Selbst-Registrierung.
// Bewusst kein Ändern/Löschen-Test: wäre eine Regel kaputt, träfe er echte Daten. Die Regeln gelten „for all“,
// die Lese-Prüfung deckt sie mit ab. HINWEIS = kein Datenleck, aber gut zu wissen.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const db = createClient(url, anonKey, { auth: { persistSession: false } });

let ok = true;
const report = (name, pass, detail) => {
  ok &&= pass;
  console.log(`${pass ? "OK  " : "FEHLER"} ${name}${detail ? ` (${detail})` : ""}`);
};
const note = (name, detail) => console.log(`HINWEIS ${name}${detail ? ` (${detail})` : ""}`);

// 1. Lesen: jede Tabelle aus den Migrationen
const TABLES = [
  "people", "areas", "milestones", "organizations", "tasks", "decisions", "links", "comments",
  "activity", "notifications", "user_settings", "notepads", "documents", "meetings", "feedback",
];
for (const table of TABLES) {
  const { data, error } = await db.from(table).select("*").limit(1);
  const rows = data?.length ?? 0;
  report(`${table}: ohne Anmeldung nicht lesbar`, rows === 0, error ? error.code ?? error.message : `${rows} Zeilen`);
}

// 2. Einfügen muss an den Rechten scheitern (42501), nicht an einem Pflichtfeld
const INSERTS = {
  tasks: { title: "Test von außen" },
  documents: { kind: "link", title: "Test von außen", url: "https://example.invalid" },
  meetings: { title: "Test von außen", starts_at: new Date().toISOString() },
  feedback: { body: "Test von außen" },
  notepads: { person_id: "00000000-0000-0000-0000-000000000000", content: "Test von außen" },
};
for (const [table, row] of Object.entries(INSERTS)) {
  const { error } = await db.from(table).insert(row);
  report(`${table}: ohne Anmeldung nicht beschreibbar`, error?.code === "42501", error ? `${error.code}` : "Einfügen ging durch!");
}

// 3. Datei-Speicher: privat, weder auflisten noch hochladen noch öffentlich abrufen
for (const bucket of ["dokumente", "feedback"]) {
  const { data: files, error: listErr } = await db.storage.from(bucket).list("", { limit: 5 });
  report(`Speicher ${bucket}: ohne Anmeldung nicht auflistbar`, (files?.length ?? 0) === 0, listErr ? listErr.message : `${files?.length ?? 0} Einträge`);
  const { error: upErr } = await db.storage.from(bucket).upload(`test-von-aussen-${Date.now()}.png`, new Blob(["x"], { type: "image/png" }));
  report(`Speicher ${bucket}: ohne Anmeldung kein Hochladen`, Boolean(upErr), upErr?.message ?? "Hochladen ging durch!");
  const { data: pub } = db.storage.from(bucket).getPublicUrl("x.png");
  const res = await fetch(pub.publicUrl);
  report(`Speicher ${bucket}: nicht öffentlich`, res.status >= 400, `Status ${res.status}`);
}

// 4. Hilfsfunktionen verraten nichts
const { data: member } = await db.rpc("is_team_member");
report("is_team_member() ohne Anmeldung nicht true", member !== true, String(member));
const { data: pid } = await db.rpc("current_person_id");
report("current_person_id() ohne Anmeldung leer", pid == null, String(pid));

// 5. Live-Kanäle: Datenbank-Änderungen laufen über RLS. Die Anwesenheit („… schreibt gerade“) ist ein offener Kanal.
const presence = await new Promise((resolve) => {
  const ch = db.channel("notes-presence-area-venue", { config: { presence: { key: "check" } } });
  const timer = setTimeout(() => resolve({ status: "TIMEOUT" }), 8000);
  ch.subscribe((status) => {
    if (status !== "SUBSCRIBED" && status !== "CHANNEL_ERROR") return;
    clearTimeout(timer);
    setTimeout(() => resolve({ status, others: Object.keys(ch.presenceState()).length }), 1500);
  });
});
if (presence.status === "SUBSCRIBED") {
  note("Anwesenheits-Kanal ohne Anmeldung betretbar", `gerade ${presence.others} da; sichtbar wären nur Personen-ID und „tippt“, keine Inhalte`);
} else {
  console.log(`OK   Anwesenheits-Kanal ohne Anmeldung zu (${presence.status})`);
}
await db.removeAllChannels();

// 6. Selbst-Registrierung
const probe = `selbst-registrierung-test-${Date.now()}@example.invalid`;
const { data: signUp, error: signUpError } = await db.auth.signUp({ email: probe, password: "Test-" + Math.random().toString(36).slice(2) + "-x9" });
report("Selbst-Registrierung gesperrt", Boolean(signUpError) && !signUp?.user, signUpError?.message ?? "Konto wurde angelegt!");

console.log(ok ? "\nAlles dicht." : "\nMindestens ein Check ist durchgefallen.");
process.exit(ok ? 0 : 1);
