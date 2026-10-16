import "server-only";
import { createHash, createSign } from "node:crypto";
import { readFileSync } from "node:fs";
import { createAdminClient } from "@/lib/supabase/admin";
import { TIME_ZONE } from "@/lib/dates";
import { FOLLOW_UP_ROUNDS } from "@/lib/phases";
import { APP_NAME } from "@/lib/brand";

// Kalender-Sync (17.10., Plan „Plan_Kalender-Sync.md“ im OneDrive): Ein Google-Dienstkonto besitzt je Person einen
// Kalender „hack-vienna HQ“ und teilt ihn mit ihr zum Lesen. Darin steht alles, was im HQ-Kalender steht (Termine,
// offene Meilensteine, Nachfass-Runden), dazu die eigenen privaten Termine. Einbahnstraße: geändert wird nur im Tool.
// Abgleich = Soll (aus der Datenbank) gegen Ist (in Google). Gleiche Nummer wie im Tool, darum nie doppelt. Ausgelöst von
// der Datenbank (/api/kalender) und einmal täglich (/api/ping); immer nur ein Lauf gleichzeitig (runSync, Sperre in
// der Tabelle kalender_sync), Änderungen während eines Laufs gleicht er danach nochmal ab.
//
// Umgebung: GOOGLE_SERVICE_ACCOUNT = JSON-Schlüssel des Dienstkontos (Maxi trägt ihn in Vercel ein). Lokal alternativ
// GOOGLE_SERVICE_ACCOUNT_FILE = Pfad zur heruntergeladenen JSON-Datei (der Schlüssel muss so nie kopiert werden).
// Zum Testen: KALENDER_TAG=test (eigene Kalender „… (Test)“), KALENDER_NUR=<Mail> (nur diese Person),
// KALENDER_PROBE=1 (nur mit Tag „test“: Probe-Termine nur in Google, nie in der Datenbank).

const API = "https://www.googleapis.com/calendar/v3";
const APP_URL = "https://hack-vienna-hq.vercel.app";
const TAG = /^[a-z]+$/.test(process.env.KALENDER_TAG ?? "") ? process.env.KALENDER_TAG! : "hq";
const ONLY = process.env.KALENDER_NUR?.trim().toLowerCase() || null;
const PROBE = TAG === "test" && process.env.KALENDER_PROBE === "1";

export const calendarConfigured = () => !!(process.env.GOOGLE_SERVICE_ACCOUNT || process.env.GOOGLE_SERVICE_ACCOUNT_FILE);

const serviceKey = () =>
  JSON.parse(
    process.env.GOOGLE_SERVICE_ACCOUNT ||
      (process.env.GOOGLE_SERVICE_ACCOUNT_FILE ? readFileSync(process.env.GOOGLE_SERVICE_ACCOUNT_FILE, "utf8") : "{}")
  ) as { client_email?: string; private_key?: string };

// ---------------------------------------------------------------
// Anmeldung als Dienstkonto (JWT, ohne zusätzliches Paket)
// ---------------------------------------------------------------
let token: { value: string; until: number } | null = null;

async function accessToken() {
  if (token && token.until > Date.now() + 60_000) return token.value;
  const key = serviceKey();
  if (!key.client_email || !key.private_key) throw new Error("GOOGLE_SERVICE_ACCOUNT fehlt oder ist unvollständig");
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
    iss: key.client_email,
    scope: "https://www.googleapis.com/auth/calendar",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(key.private_key, "base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }),
  });
  if (!res.ok) throw new Error(`Google-Anmeldung: HTTP ${res.status}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  token = { value: data.access_token, until: Date.now() + data.expires_in * 1000 };
  return token.value;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Aufruf der Calendar-Schnittstelle. Bei „zu schnell“ (403/429) und Serverfehlern bis zu 4 Versuche mit Pause. */
async function gcal(method: string, path: string, opts: { body?: object; query?: Record<string, string> } = {}) {
  const url = `${API}${path}${opts.query ? `?${new URLSearchParams(opts.query)}` : ""}`;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${await accessToken()}`, ...(opts.body ? { "Content-Type": "application/json" } : {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const text = await res.text();
    let data: Record<string, unknown> = {};
    try {
      data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
      // Google liefert bei Störungen manchmal eine HTML-Seite
    }
    const retry = res.status === 429 || res.status >= 500 || (res.status === 403 && /rateLimitExceeded|userRateLimitExceeded/.test(text));
    if (retry && attempt < 3) {
      await wait(800 * 2 ** attempt);
      continue;
    }
    return { status: res.status, data };
  }
}

async function must(method: string, path: string, opts: { body?: object; query?: Record<string, string> } = {}) {
  const r = await gcal(method, path, opts);
  if (r.status >= 300) throw new Error(`Google ${method} ${path.split("?")[0]}: HTTP ${r.status}`);
  return r.data;
}

/** Höchstens `n` Aufrufe gleichzeitig (Google bremst sonst). */
async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.min(n, queue.length) }, async () => {
    for (let x = queue.shift(); x !== undefined; x = queue.shift()) await fn(x);
  }));
}

// ---------------------------------------------------------------
// Kalender je Person: erkannt an „hq:<tag>:<Person>“ in der Beschreibung
// ---------------------------------------------------------------
type Person = { id: string; name: string; email: string | null };

const marker = (personId: string) => `hq:${TAG}:${personId}`;

async function calendarsByPerson() {
  const map = new Map<string, string>();
  let page: string | undefined;
  do {
    const data = await must("GET", "/users/me/calendarList", { query: { maxResults: "250", ...(page ? { pageToken: page } : {}) } });
    for (const c of (data.items as { id: string; description?: string }[]) ?? []) {
      const m = c.description?.match(new RegExp(`hq:${TAG}:([0-9a-f-]{36})`));
      if (m) map.set(m[1], c.id);
    }
    page = data.nextPageToken as string | undefined;
  } while (page);
  return map;
}

/** Fehlende Kalender anlegen und mit der Person teilen; mit `checkShares` auch bestehende Freigaben prüfen. */
async function ensureCalendars(people: Person[], existing: Map<string, string>, checkShares: boolean) {
  for (const p of people) {
    if (!p.email) continue;
    let id = existing.get(p.id);
    const isNew = !id;
    if (!id) {
      const cal = await must("POST", "/calendars", {
        body: {
          summary: TAG === "hq" ? APP_NAME : `${APP_NAME} (Test)`,
          description: `Termine und Meilensteine aus ${APP_NAME} (${APP_URL}). Ändern nur im Tool.\n\n${marker(p.id)}`,
          timeZone: TIME_ZONE,
        },
      });
      id = cal.id as string;
      existing.set(p.id, id);
    }
    if (!isNew && !checkShares) continue;
    const acl = await must("GET", `/calendars/${encodeURIComponent(id)}/acl`);
    const rules = (acl.items as { id: string; role: string; scope: { type: string; value?: string } }[]) ?? [];
    const email = p.email.toLowerCase();
    if (!rules.some((r) => r.scope.type === "user" && r.scope.value?.toLowerCase() === email && r.role !== "none"))
      await must("POST", `/calendars/${encodeURIComponent(id)}/acl`, { body: { role: "reader", scope: { type: "user", value: email } } });
    // Alte Adresse (Person hat eine neue Mail bekommen) wieder austragen; der Besitzer (Dienstkonto) bleibt.
    for (const r of rules)
      if (r.scope.type === "user" && r.role === "reader" && r.scope.value?.toLowerCase() !== email)
        await gcal("DELETE", `/calendars/${encodeURIComponent(id)}/acl/${encodeURIComponent(r.id)}`);
  }
}

// ---------------------------------------------------------------
// Soll: was in welchem Kalender stehen muss
// ---------------------------------------------------------------
type Meeting = {
  id: string;
  title: string;
  starts_at: string;
  duration_min: number;
  location: string | null;
  meet_url: string | null;
  organization_id: string | null;
  attendees: string[];
  private_for: string | null;
};
type Milestone = { id: string; title: string; due_date: string; status: string; parent_id: string | null };
type GEvent = Record<string, unknown>;

/** Google-Nummern erlauben nur 0–9 und a–v: Termin = UUID ohne Striche, Meilenstein = „ms“ + Hex, Runde = „nr“ + Datum. */
const meetingEventId = (id: string) => id.replace(/-/g, "").toLowerCase();
const milestoneEventId = (id: string) => `ms${Buffer.from(id).toString("hex")}`;
const roundEventId = (date: string) => `nr${date.replace(/-/g, "")}`;

const nextDay = (date: string) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

/** Meet-Link aus dem Feld (dort steht manchmal noch Googles ganzer Block). */
const meetLink = (raw: string | null) => raw?.match(/https?:\/\/\S+/)?.[0] ?? null;

function meetingEvent(m: Meeting, names: Map<string, string>, orgs: Map<string, string>): GEvent {
  const end = new Date(new Date(m.starts_at).getTime() + m.duration_min * 60_000).toISOString();
  const meet = meetLink(m.meet_url);
  const who = m.attendees.map((id) => names.get(id)).filter(Boolean);
  const description = [
    m.private_for ? "Nur für dich" : who.length ? `Mit: ${who.join(", ")}` : "",
    m.organization_id && orgs.get(m.organization_id) ? `Firma: ${orgs.get(m.organization_id)}` : "",
    meet ? `Meet: ${meet}` : "",
    `Agenda und Notizen: ${APP_URL}/termine?termin=${m.id}`,
  ].filter(Boolean);
  return {
    id: meetingEventId(m.id),
    summary: m.title,
    ...(m.location || meet ? { location: m.location || meet } : {}),
    description: description.join("\n"),
    start: { dateTime: new Date(m.starts_at).toISOString(), timeZone: TIME_ZONE },
    end: { dateTime: end, timeZone: TIME_ZONE },
    // Kein visibility: "private": Mit Leserecht sähe die Person dann nur „Beschäftigt“ (Google, Acl-Rollen). Private Termine
    // stehen ohnehin nur im eigenen Kalender. Keine eigene Farbe für „ohne mich“: Google zeigt in geteilten Kalendern mit
    // Leserecht nur die Kalenderfarbe (gemessen 17.10.). Wer dabei ist, steht in der Beschreibung.
  };
}

function allDayEvent(id: string, date: string, summary: string, link: string): GEvent {
  return {
    id,
    summary,
    description: link,
    start: { date },
    end: { date: nextDay(date) },
    transparency: "transparent",
  };
}

/** Meilensteine wie auf der Seite Termine: offene, ohne Unterpunkte, die am selben Tag wie ihr offener Meilenstein fällig sind. */
function milestoneEvents(milestones: Milestone[]) {
  const byId = new Map(milestones.map((m) => [m.id, m]));
  const inParent = (m: Milestone) => {
    const p = m.parent_id ? byId.get(m.parent_id) : undefined;
    return !!p && p.status !== "erledigt" && p.due_date === m.due_date;
  };
  return milestones
    .filter((m) => m.status !== "erledigt" && !inParent(m))
    .map((m) => allDayEvent(milestoneEventId(m.id), m.due_date, `${m.id} ${m.title}`, `Roadmap: ${APP_URL}/roadmap?m=${encodeURIComponent(m.id)}`));
}

const hashOf = (e: GEvent) => createHash("sha1").update(JSON.stringify(e)).digest("hex").slice(0, 16);

function probeMeetings(viewer: string): Meeting[] {
  const at = (days: number, hour: number) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + days);
    d.setUTCHours(hour - 2, 0, 0, 0);
    return d.toISOString();
  };
  const base = { location: null, meet_url: null, organization_id: null };
  return [
    { ...base, id: "00000000-0000-4000-8000-000000000001", title: "Probe: Jour fixe (du dabei)", starts_at: at(1, 10), duration_min: 30, attendees: [viewer], private_for: null, meet_url: "https://meet.google.com/abc-defg-hij" },
    { ...base, id: "00000000-0000-4000-8000-000000000002", title: "Probe: Call ohne dich", starts_at: at(1, 14), duration_min: 60, attendees: ["00000000-0000-4000-8000-0000000000ff"], private_for: null },
    { ...base, id: "00000000-0000-4000-8000-000000000003", title: "Probe: Erinnerung nur für mich", starts_at: at(2, 9), duration_min: 15, attendees: [viewer], private_for: viewer },
    { ...base, id: "00000000-0000-4000-8000-000000000004", title: "Probe: privat von jemand anderem", starts_at: at(2, 11), duration_min: 15, attendees: [], private_for: "00000000-0000-4000-8000-0000000000ff" },
  ];
}

// ---------------------------------------------------------------
// Abgleich
// ---------------------------------------------------------------
type Existing = { id: string; status: string; hash: string | null };

async function existingEvents(calendarId: string) {
  const out = new Map<string, Existing>();
  let page: string | undefined;
  do {
    const data = await must("GET", `/calendars/${encodeURIComponent(calendarId)}/events`, {
      query: { privateExtendedProperty: "hq=1", showDeleted: "true", maxResults: "2500", ...(page ? { pageToken: page } : {}) },
    });
    for (const e of (data.items as { id: string; status: string; extendedProperties?: { private?: { hash?: string } } }[]) ?? [])
      out.set(e.id, { id: e.id, status: e.status, hash: e.extendedProperties?.private?.hash ?? null });
    page = data.nextPageToken as string | undefined;
  } while (page);
  return out;
}

export type SyncResult = { calendars: number; created: number; updated: number; removed: number; failed: number };

async function syncCalendar(calendarId: string, wanted: GEvent[], result: SyncResult) {
  const have = await existingEvents(calendarId);
  const base = `/calendars/${encodeURIComponent(calendarId)}/events`;
  const jobs: (() => Promise<void>)[] = [];
  const wantedIds = new Set<string>();

  for (const e of wanted) {
    const id = e.id as string;
    wantedIds.add(id);
    const hash = hashOf(e);
    const now = have.get(id);
    if (now && now.status !== "cancelled" && now.hash === hash) continue;
    const body = { ...e, status: "confirmed", extendedProperties: { private: { hq: "1", hash } } };
    jobs.push(async () => {
      // Neu anlegen; gibt es die Nummer schon (auch gelöscht, z. B. nach „Rückgängig“), überschreiben.
      let r = now ? await gcal("PUT", `${base}/${id}`, { body }) : await gcal("POST", base, { body });
      if (!now && r.status === 409) r = await gcal("PUT", `${base}/${id}`, { body });
      else if (now && r.status === 404) r = await gcal("POST", base, { body });
      if (r.status >= 300) result.failed++;
      else if (now && now.status !== "cancelled") result.updated++;
      else result.created++;
    });
  }
  for (const e of have.values()) {
    if (wantedIds.has(e.id) || e.status === "cancelled") continue;
    jobs.push(async () => {
      const r = await gcal("DELETE", `${base}/${e.id}`);
      if (r.status >= 300 && r.status !== 404 && r.status !== 410) result.failed++;
      else result.removed++;
    });
  }
  await pool(jobs, 4, (job) => job());
}

/** Alles abgleichen. `checkShares` (täglich) prüft zusätzlich die Freigaben der bestehenden Kalender. */
export async function syncCalendars({ checkShares = false } = {}): Promise<SyncResult> {
  const db = createAdminClient();
  const [people, meetings, milestones] = await Promise.all([
    db.from("people").select("id, name, email"),
    db.from("meetings").select("id, title, starts_at, duration_min, location, meet_url, organization_id, attendees, private_for"),
    db.from("milestones").select("id, title, due_date, status, parent_id"),
  ]);
  if (people.error || meetings.error || milestones.error)
    throw new Error(`Datenbank: ${people.error?.message ?? meetings.error?.message ?? milestones.error?.message}`);

  const orgIds = [...new Set((meetings.data as Meeting[]).map((m) => m.organization_id).filter((id): id is string => !!id))];
  const orgs = new Map<string, string>();
  if (orgIds.length) {
    const { data, error } = await db.from("organizations").select("id, name").in("id", orgIds);
    if (error) throw new Error(`Datenbank: ${error.message}`);
    for (const o of data) orgs.set(o.id, o.name);
  }

  const team = (people.data as Person[]).filter((p) => !ONLY || p.email?.toLowerCase() === ONLY);
  const names = new Map((people.data as Person[]).map((p) => [p.id, p.name]));
  const shared = [
    ...milestoneEvents(milestones.data as Milestone[]),
    ...FOLLOW_UP_ROUNDS.map((d) => allDayEvent(roundEventId(d), d, "Nachfass-Runde", `Pipeline: ${APP_URL}/pipeline`)),
  ];

  const calendars = await calendarsByPerson();
  await ensureCalendars(team, calendars, checkShares);

  const result: SyncResult = { calendars: 0, created: 0, updated: 0, removed: 0, failed: 0 };
  for (const p of team) {
    const calendarId = calendars.get(p.id);
    if (!calendarId) continue;
    const list = [...(meetings.data as Meeting[]), ...(PROBE ? probeMeetings(p.id) : [])];
    const wanted = [
      ...list.filter((m) => !m.private_for || m.private_for === p.id).map((m) => meetingEvent(m, names, orgs)),
      ...shared,
    ];
    // Ein Kalender mit Fehler hält die anderen nicht auf
    try {
      await syncCalendar(calendarId, wanted, result);
      result.calendars++;
    } catch (e) {
      result.failed++;
      console.error("Kalender-Abgleich einer Person fehlgeschlagen:", e instanceof Error ? e.message : e);
    }
  }
  return result;
}

/** Link „Zu Google Kalender“ für eine Person (öffnet Google mit „Kalender hinzufügen?“). null = noch nicht eingerichtet. */
export async function calendarLinkFor(personId: string) {
  if (!calendarConfigured()) return null;
  const id = (await calendarsByPerson()).get(personId);
  return id ? `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(id)}` : null;
}

/**
 * Abgleich mit Sperre: läuft schon einer, merkt sich die Datenbank die Änderung und der laufende gleicht danach nochmal ab.
 * `full` (täglich) prüft auch die Freigaben, höchstens alle 20 h. Test-Kalender (KALENDER_TAG) laufen ohne Sperre,
 * damit ein lokaler Test nichts in die Datenbank schreibt.
 */
export async function runSync(full = false): Promise<SyncResult[]> {
  if (TAG !== "hq") return [await syncCalendars({ checkShares: full })];
  const db = createAdminClient();
  const { data: started, error } = await db.rpc("kalender_start", { full_run: full });
  if (error) throw new Error(`Sperre: ${error.message}`);
  if (!started) return [];
  const results: SyncResult[] = [];
  try {
    for (let round = 0; round < 4; round++) {
      results.push(await syncCalendars({ checkShares: full && round === 0 }));
      const { data: again } = await db.rpc("kalender_ende");
      if (!again) break;
    }
  } catch (e) {
    await db.rpc("kalender_ende");
    throw e;
  }
  return results;
}
