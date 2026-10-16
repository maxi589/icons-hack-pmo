// Backup außerhalb von Supabase (16.10.): alle Tabellen und alle Dateien in den OneDrive-Ordner auf Maxis PC.
// Supabase Free macht keine eigenen Backups (supabase.com/pricing, gelesen 16.10.).
// Aufruf im Repo: node --env-file=.env.local scripts/backup.mjs [Zielordner]
// Täglich automatisch über die Windows-Aufgabe „hack-vienna Backup“ (einrichten: scripts/backup-task.ps1).
//
// Ablage im Zielordner:
//   <JJJJ-MM-TT>/tabellen/<tabelle>.json   jeden Tag neu (ein zweiter Lauf am selben Tag überschreibt)
//   <JJJJ-MM-TT>/dateien.json              welche Dateien es an dem Tag gab
//   dateien/<speicher>/<pfad>              gemeinsam für alle Tage, nur neue oder geänderte Dateien werden geladen
//   _letzte-sicherung.txt                  Ergebnis des letzten Laufs (auch Fehler)
// Nur lesen, nie schreiben. Bewusst ohne „notepads“: das sind private Notizblöcke der einzelnen Personen.

import { createClient } from "@supabase/supabase-js";
import { mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const SKIP_TABLES = new Set(["notepads"]);
const PAGE = 1000;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
const target = process.argv[2] ?? join(homedir(), "OneDrive - WU Wien", "01 icons Hack PMO", "backup");
const day = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Vienna" }).format(new Date()); // 2026-10-16
const stamp = new Intl.DateTimeFormat("de-AT", { timeZone: "Europe/Vienna", dateStyle: "short", timeStyle: "short" }).format(new Date());

async function status(text) {
  await mkdir(target, { recursive: true });
  await writeFile(join(target, "_letzte-sicherung.txt"), `${text}\n`);
}

async function tableNames() {
  // Liste aller Tabellen aus der REST-Schnittstelle: neue Tabellen kommen so von selbst mit.
  const res = await fetch(`${url}/rest/v1/`, { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/openapi+json" } });
  if (!res.ok) throw new Error(`Tabellenliste: HTTP ${res.status}`);
  const defs = (await res.json()).definitions ?? {};
  return Object.entries(defs).map(([name, def]) => ({ name, order: def.properties?.id ? "id" : Object.keys(def.properties ?? {})[0] }));
}

// Lesen bis zur leeren Seite (nicht bis „weniger als PAGE“): liefert der Server kleinere Seiten, endete es sonst still.
async function dumpTable(db, { name, order }) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db.from(name).select("*").order(order).range(from, from + PAGE - 1);
    if (error) throw new Error(`Tabelle ${name}: ${error.message}`);
    if (!data.length) return rows;
    rows.push(...data);
  }
}

/** Alle Dateien eines Speichers, auch in Unterordnern (Ordner haben in der Liste keine id). */
async function listFiles(db, bucket, prefix = "") {
  const out = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await db.storage.from(bucket).list(prefix, { limit: PAGE, offset });
    if (error) throw new Error(`Speicher ${bucket}/${prefix}: ${error.message}`);
    if (!data.length) return out;
    for (const e of data) {
      const path = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.id === null) out.push(...(await listFiles(db, bucket, path)));
      else out.push({ bucket, path, size: e.metadata?.size ?? null, updated_at: e.updated_at });
    }
  }
}

async function sameSize(file, size) {
  try {
    return size !== null && (await stat(file)).size === size;
  } catch {
    return false;
  }
}

async function main() {
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL oder SUPABASE_SECRET_KEY fehlt (Aufruf mit --env-file=.env.local)");
  const db = createClient(url, key, { auth: { persistSession: false } });
  const dayDir = join(target, day);
  // Erst in einen neuen Ordner schreiben und am Ende tauschen: Ein Lauf, der mittendrin scheitert, lässt den guten
  // Stand desselben Tages unangetastet.
  const fresh = join(dayDir, "tabellen.neu");
  await rm(fresh, { recursive: true, force: true });
  await mkdir(fresh, { recursive: true });

  const counts = [];
  for (const t of await tableNames()) {
    if (SKIP_TABLES.has(t.name)) continue;
    const rows = await dumpTable(db, t);
    await writeFile(join(fresh, `${t.name}.json`), JSON.stringify(rows, null, 1));
    counts.push(`${t.name} ${rows.length}`);
  }

  const { data: buckets, error } = await db.storage.listBuckets();
  if (error) throw new Error(`Speicherliste: ${error.message}`);
  const files = [];
  const failed = [];
  let loaded = 0;
  let bytes = 0;
  for (const b of buckets) {
    for (const f of await listFiles(db, b.id)) {
      files.push(f);
      const local = join(target, "dateien", b.id, ...f.path.split("/"));
      if (await sameSize(local, f.size)) continue;
      // Eine einzelne Datei (z. B. inzwischen gelöscht) bricht nicht die ganze Sicherung ab
      const { data: blob, error: dlError } = await db.storage.from(b.id).download(f.path);
      if (dlError) {
        failed.push(`${b.id}/${f.path}`);
        continue;
      }
      const buf = Buffer.from(await blob.arrayBuffer());
      await mkdir(dirname(local), { recursive: true });
      await writeFile(local, buf);
      loaded++;
      bytes += buf.length;
    }
  }

  await rm(join(dayDir, "tabellen"), { recursive: true, force: true });
  await rename(fresh, join(dayDir, "tabellen"));
  await writeFile(join(dayDir, "dateien.json"), JSON.stringify(files, null, 1));

  const size = bytes < 1e6 ? `${Math.ceil(bytes / 1e3)} kB` : `${(bytes / 1e6).toFixed(1)} MB`;
  const head = failed.length ? `TEILWEISE ${stamp} (${failed.length} Dateien nicht geladen: ${failed.join(", ")})` : `OK ${stamp}`;
  const summary = `${head}: ${counts.length} Tabellen (${counts.join(", ")}), ${files.length} Dateien (${loaded} neu geladen, ${size}) → ${dayDir}`;
  await status(summary);
  console.log(summary);
}

// Bis zu 3 Versuche mit je 5 Minuten Pause: Die Windows-Aufgabe holt verpasste Läufe direkt nach dem Hochfahren nach,
// dann ist das WLAN oft noch nicht da (Prüfer, 16.10.).
const TRIES = 3;
const PAUSE_MS = 5 * 60_000;
for (let attempt = 1; ; attempt++) {
  try {
    await main();
    break;
  } catch (e) {
    const last = attempt >= TRIES;
    const text = `FEHLER ${stamp}: ${e.message}${last ? "" : ` (Versuch ${attempt} von ${TRIES}, nächster in 5 min)`}`;
    console.error(text);
    await status(text).catch(() => {});
    if (last) process.exit(1);
    await new Promise((r) => setTimeout(r, PAUSE_MS));
  }
}
