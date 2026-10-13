// Sicherheits-Check von außen, nur mit dem öffentlichen Schlüssel (wie ein Fremder im Browser).
// Aufruf im Repo: node --env-file=.env.local scripts/check-security.mjs
// Erwartung: keine Daten ohne Anmeldung, keine Selbst-Registrierung möglich.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const db = createClient(url, anonKey, { auth: { persistSession: false } });

let ok = true;
const report = (name, pass, detail) => {
  ok &&= pass;
  console.log(`${pass ? "OK  " : "FEHLER"} ${name}${detail ? ` (${detail})` : ""}`);
};

for (const table of ["people", "areas", "milestones", "organizations", "tasks", "comments", "notifications"]) {
  const { data, error } = await db.from(table).select("*").limit(1);
  const rows = data?.length ?? 0;
  report(`${table}: ohne Anmeldung nicht lesbar`, rows === 0, error ? error.code ?? error.message : `${rows} Zeilen`);
}

const { error: insertError } = await db.from("tasks").insert({ title: "Test von außen" });
report("tasks: ohne Anmeldung nicht beschreibbar", Boolean(insertError), insertError?.code ?? "Einfügen ging durch!");

const probe = `selbst-registrierung-test-${Date.now()}@example.invalid`;
const { data: signUp, error: signUpError } = await db.auth.signUp({ email: probe, password: "Test-" + Math.random().toString(36).slice(2) + "-x9" });
report("Selbst-Registrierung gesperrt", Boolean(signUpError) && !signUp?.user, signUpError?.message ?? "Konto wurde angelegt!");

console.log(ok ? "\nAlles dicht." : "\nMindestens ein Check ist durchgefallen.");
process.exit(ok ? 0 : 1);
