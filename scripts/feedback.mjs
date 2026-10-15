// Feedback aus dem Tool lesen, z. B. „arbeite das Feedback ab“ im Chat mit Claude.
// Nur lesen: Den Status setzt Maxi im Tool (Inbox → Feedback → Umgesetzt / Verworfen).
//
//   node --env-file=.env.local scripts/feedback.mjs                 offenes Feedback, Bilder in den Temp-Ordner
//   node --env-file=.env.local scripts/feedback.mjs --alle          auch umgesetztes und verworfenes
//   node --env-file=.env.local scripts/feedback.mjs --out <ordner>  Bilder dorthin speichern
//
// Bilder nie ins Repo legen (können Partner-Daten zeigen).

import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL oder SUPABASE_SECRET_KEY fehlt in .env.local");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const args = process.argv.slice(2);
const all = args.includes("--alle");
const outIdx = args.indexOf("--out");
const out = outIdx >= 0 ? args[outIdx + 1] : join(tmpdir(), "hack-vienna-feedback");

const when = (iso) =>
  new Intl.DateTimeFormat("de-AT", { timeZone: "Europe/Vienna", weekday: "short", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso)
  );

let query = db.from("feedback").select("*").order("created_at", { ascending: true });
if (!all) query = query.eq("status", "offen");
const { data: rows, error } = await query;
if (error) {
  console.error(error.message);
  process.exit(1);
}
const { data: people } = await db.from("people").select("id, name");
const name = (id) => people?.find((p) => p.id === id)?.name ?? "–";

if (!rows.length) {
  console.log(all ? "Noch kein Feedback." : "Kein offenes Feedback.");
  process.exit(0);
}
await mkdir(out, { recursive: true });

for (const [i, f] of rows.entries()) {
  const c = f.context ?? {};
  let image = "–";
  if (f.screenshot_path) {
    const { data: file, error: e } = await db.storage.from("feedback").download(f.screenshot_path);
    if (file && !e) {
      image = join(out, `${f.id}.jpg`);
      await writeFile(image, Buffer.from(await file.arrayBuffer()));
    } else image = `nicht ladbar (${e?.message ?? "?"})`;
  }
  console.log(`\n## ${i + 1}. ${f.kind ?? "ohne Art"} · ${f.status} · ${name(f.author_id)} · ${when(f.created_at)}`);
  console.log(`id:       ${f.id}`);
  console.log(`Seite:    ${f.page || "–"}`);
  if (c.spot) console.log(`Stelle:   ${c.spot.hint}  (x ${c.spot.rect.x}, y ${c.spot.rect.y}, ${c.spot.rect.w}×${c.spot.rect.h})`);
  console.log(`Gerät:    ${[c.device, c.browser, c.viewport, c.theme].filter(Boolean).join(" · ") || "–"}`);
  console.log(`Version:  ${c.version ?? "–"}`);
  if (c.errors?.length) console.log(`Fehler:\n${c.errors.map((e) => `  - ${e.message}`).join("\n")}`);
  console.log(`Bild:     ${image}`);
  console.log(`Text:\n${f.body.replace(/^/gm, "  ")}`);
}
console.log(`\n${rows.length} Einträge${all ? "" : " offen"}.`);
