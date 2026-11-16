import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayInVienna } from "@/lib/dates";
import { viennaParts } from "@/lib/meetings";
import { searchAll } from "@/lib/search";
import { ROLE_NAMES, TABS, shiftFollowUp, stageName, type Role, type Stage, type TabId } from "@/lib/pipeline";

// Werkzeuge des MCP-Servers (/api/mcp, docs/MCP.md). Lesen und Schreiben, nie löschen oder senden.
// Daten über den Secret Key (Team-Daten, alle sehen alles wie in der App); private Termine anderer bleiben verborgen.
// Jede Schreibaktion schreibt Verlauf mit actor = Person des Schlüssels und data.via = "mcp" („über KI“).

export class InputError extends Error {}
type Args = Record<string, unknown>;
export type Ctx = { me: { id: string; name: string }; tokenName: string };
export type Tool = {
  name: string;
  description: string;
  inputSchema: object;
  annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean; idempotentHint?: boolean };
  run: (a: Args, ctx: Ctx) => Promise<unknown>;
};

const APP_URL = "https://hack-vienna-hq.vercel.app";
const VIA = { via: "mcp" } as const;
const db = () => createAdminClient();

// ------------------------------------------------------------------ Helfer

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const str = (v: unknown) => (typeof v === "string" ? v.trim() : v == null ? undefined : String(v).trim());
function date(v: unknown, name: string): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  const s = String(v);
  if (!DATE.test(s) || new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) !== s) throw new InputError(`${name}: Datum als JJJJ-MM-TT`);
  return s;
}
const P = {
  text: (d: string) => ({ type: "string", description: d }),
  date: (d: string) => ({ type: "string", description: `${d} (JJJJ-MM-TT, leer = entfernen)` }),
  pick: (values: readonly string[], d: string) => ({ type: "string", enum: [...values], description: d }),
};
const FIRMA = { type: "string", description: "Firma: id oder Name (Teil des Namens reicht, wenn eindeutig)" };

type Person = { id: string; name: string; initials: string };
async function loadPeople(): Promise<Person[]> {
  const { data, error } = await db().from("people").select("id, name, initials").order("sort");
  if (error) throw error;
  return data ?? [];
}
const nameOf = (people: Person[], id: string | null) => (id ? (people.find((p) => p.id === id)?.name ?? "?") : null);

/** „ich“, Name („Tim“, „Maxi S“) oder Initialen → people.id; leer → null. */
function personId(people: Person[], v: unknown, ctx: Ctx): string | null {
  const s = str(v)?.toLowerCase();
  if (!s) return null;
  if (["ich", "mir", "mich", "me"].includes(s)) return ctx.me.id;
  const exact = people.filter((p) => p.name.toLowerCase() === s || p.initials.toLowerCase() === s);
  const hits = exact.length ? exact : people.filter((p) => p.name.toLowerCase().startsWith(s));
  if (hits.length === 1) return hits[0].id;
  throw new InputError(`Person „${v}“ ${hits.length ? "nicht eindeutig" : "nicht gefunden"}. Team: ${people.map((p) => p.name).join(", ")}`);
}

const ORG_FIELDS =
  "id, name, roles, category, location, prio, wave, stage, lost_reason, owner_id, existing_contact, warm_via, contact_person, contact_info, url, next_follow_up, notes, capacity, overnight, price, amount, updated_at";
type Org = {
  id: string;
  name: string;
  roles: Role[];
  category: string | null;
  location: string | null;
  prio: string | null;
  wave: number | null;
  stage: Stage;
  lost_reason: string | null;
  owner_id: string | null;
  existing_contact: string | null;
  warm_via: string | null;
  contact_person: string | null;
  contact_info: string | null;
  url: string | null;
  next_follow_up: string | null;
  notes: string | null;
  capacity: string | null;
  overnight: string | null;
  price: string | null;
  amount: number | null;
  updated_at: string;
};

async function allOrgs(): Promise<Org[]> {
  const { data, error } = await db().from("organizations").select(ORG_FIELDS).order("name");
  if (error) throw error;
  return (data ?? []) as Org[];
}

/** Firma über id oder Name finden: exakter Name vor Teil des Namens; mehrdeutig → Liste zur Auswahl. */
async function findOrg(v: unknown): Promise<Org> {
  const ref = str(v);
  if (!ref) throw new InputError("firma fehlt");
  const orgs = await allOrgs();
  const byId = orgs.find((o) => o.id === ref);
  if (byId) return byId;
  const s = ref.toLowerCase();
  const exact = orgs.filter((o) => o.name.toLowerCase() === s);
  const hits = exact.length ? exact : orgs.filter((o) => o.name.toLowerCase().includes(s));
  if (hits.length === 1) return hits[0];
  if (!hits.length) throw new InputError(`Firma „${ref}“ nicht gefunden. Mit firmen_suchen nach Teilen des Namens suchen.`);
  throw new InputError(`„${ref}“ ist nicht eindeutig: ${hits.map((o) => `${o.name} (${o.id})`).join("; ")}`);
}

const tabsOf = (o: Pick<Org, "roles">) => TABS.filter((t) => o.roles.some((r) => t.roles.includes(r))).map((t) => t.name);
const orgLink = (o: Pick<Org, "id" | "roles">) => {
  const tab = TABS.find((t) => o.roles.some((r) => t.roles.includes(r)))?.id ?? "partner";
  return `${APP_URL}/pipeline?tab=${tab}&firma=${o.id}`;
};

function orgShort(o: Org, people: Person[]) {
  return {
    id: o.id,
    name: o.name,
    typ: tabsOf(o).join(", "),
    stufe: stageName(o.stage),
    prio: o.prio,
    zustaendig: nameOf(people, o.owner_id),
    ansprechperson: o.contact_person,
    kontakt: o.contact_info,
    nachfassen: o.next_follow_up,
  };
}

async function log(targetType: "organization" | "task", targetId: string, ctx: Ctx, action: string, data: Record<string, unknown> = {}) {
  const { error } = await db().from("activity").insert({ target_type: targetType, target_id: targetId, actor_id: ctx.me.id, action, data: { ...data, ...VIA } });
  if (error) console.error("MCP Verlauf", error);
}

async function notifyAssignment(targetType: "organization" | "task", targetId: string, ctx: Ctx, recipient: string | null) {
  if (!recipient || recipient === ctx.me.id) return;
  await db().from("notifications").insert({ recipient_id: recipient, kind: "assignment", target_type: targetType, target_id: targetId, actor_id: ctx.me.id });
}

const fmtWhen = (iso: string) => {
  const p = viennaParts(new Date(iso));
  return `${p.date} ${p.time}`;
};

/** Termine, die diese Person sehen darf (private nur die eigenen). */
const visibleMeeting = (m: { private_for: string | null }, ctx: Ctx) => !m.private_for || m.private_for === ctx.me.id;

// ------------------------------------------------------------------ Lesen

const STAGE_IDS: Stage[] = ["recherche", "kontaktiert", "im_gespraech", "zugesagt", "fix", "abgesagt"];
const TAB_IDS = TABS.map((t) => t.id);

const read: Tool[] = [
  {
    name: "ueberblick",
    description:
      "Was steht an? Pipeline je Tab und Stufe, Nachfassen bis in 7 Tagen, offene Aufgaben (deine und bald fällige), nächste Meilensteine und Termine. Zuerst aufrufen, wenn jemand fragt, wo das Projekt steht.",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: true },
    run: async (_a, ctx) => {
      const today = todayInVienna();
      const in7 = shiftFollowUp(null, today, 7);
      const [people, orgs, tasks, milestones, meetings] = await Promise.all([
        loadPeople(),
        allOrgs(),
        db().from("tasks").select("id, title, status, assignee_id, due_date, organization_id").neq("status", "erledigt"),
        db().from("milestones").select("id, title, due_date, status, area_id").neq("status", "erledigt").order("due_date").limit(6),
        db()
          .from("meetings")
          .select("id, title, starts_at, private_for, organization_id")
          .gte("starts_at", new Date().toISOString())
          .lte("starts_at", new Date(Date.now() + 7 * 864e5).toISOString())
          .order("starts_at"),
      ]);
      const orgName = (id: string | null) => orgs.find((o) => o.id === id)?.name ?? null;
      const pipeline = Object.fromEntries(
        TABS.map((t) => {
          const inTab = orgs.filter((o) => o.roles.some((r) => t.roles.includes(r)));
          const counts = Object.fromEntries(STAGE_IDS.map((s) => [stageName(s), inTab.filter((o) => o.stage === s).length]).filter(([, n]) => n));
          return [t.name, { gesamt: inTab.length, ...counts }];
        })
      );
      const follow = orgs
        .filter((o) => o.next_follow_up && o.next_follow_up <= in7 && o.stage !== "fix" && o.stage !== "abgesagt")
        .sort((a, b) => a.next_follow_up!.localeCompare(b.next_follow_up!))
        .map((o) => ({ ...orgShort(o, people), ueberfaellig: o.next_follow_up! < today }));
      const openTasks = (tasks.data ?? [])
        .filter((t) => t.assignee_id === ctx.me.id || (t.due_date && t.due_date <= in7))
        .sort((a, b) => (a.due_date ?? "9").localeCompare(b.due_date ?? "9"))
        .map((t) => ({ id: t.id, titel: t.title, faellig: t.due_date, zustaendig: nameOf(people, t.assignee_id), firma: orgName(t.organization_id) }));
      return {
        heute: today,
        du_bist: ctx.me.name,
        pipeline,
        deine_firmen: orgs.filter((o) => o.owner_id === ctx.me.id && o.stage !== "abgesagt").length,
        nachfassen_bis_7_tage: follow,
        aufgaben: openTasks,
        naechste_meilensteine: (milestones.data ?? []).map((m) => ({ id: m.id, titel: m.title, faellig: m.due_date, status: m.status })),
        termine_7_tage: (meetings.data ?? []).filter((m) => visibleMeeting(m, ctx)).map((m) => ({ titel: m.title, wann: fmtWhen(m.starts_at), firma: orgName(m.organization_id) })),
      };
    },
  },
  {
    name: "firmen_suchen",
    description:
      "Firmen der Pipeline filtern. tab: partner (Track-Partner), sponsoren, jury, venues. zustaendig: Name oder „ich“. text sucht in Name, Ansprechperson, Kontakt, Ort und Notizen. Ohne Filter alle (Kurzform).",
    inputSchema: {
      type: "object",
      properties: {
        tab: P.pick(TAB_IDS, "Pipeline-Tab"),
        stufe: P.pick(STAGE_IDS, "Stufe"),
        prio: P.pick(["A", "B", "C"], "Prio"),
        zustaendig: P.text("Name aus dem Team oder „ich“; „niemand“ = ohne Zuständige"),
        text: P.text("Suchwort"),
        nachfassen_bis: P.date("nur Firmen mit Nachfassen bis zu diesem Datum"),
      },
    },
    annotations: { readOnlyHint: true },
    run: async (a, ctx) => {
      const people = await loadPeople();
      let orgs = await allOrgs();
      const tab = str(a.tab) as TabId | undefined;
      if (tab) {
        const t = TABS.find((x) => x.id === tab);
        if (!t) throw new InputError(`tab: eines von ${TAB_IDS.join(", ")}`);
        orgs = orgs.filter((o) => o.roles.some((r) => t.roles.includes(r)));
      }
      if (a.stufe) orgs = orgs.filter((o) => o.stage === a.stufe);
      if (a.prio) orgs = orgs.filter((o) => o.prio === a.prio);
      const z = str(a.zustaendig);
      if (z) {
        const id = z.toLowerCase() === "niemand" ? null : personId(people, z, ctx);
        orgs = orgs.filter((o) => o.owner_id === id);
      }
      const bis = date(a.nachfassen_bis, "nachfassen_bis");
      if (bis) orgs = orgs.filter((o) => o.next_follow_up && o.next_follow_up <= bis);
      const words = (str(a.text) ?? "").toLowerCase().split(/\s+/).filter(Boolean);
      if (words.length) {
        orgs = orgs.filter((o) => {
          const hay = [o.name, o.contact_person, o.contact_info, o.location, o.notes, o.category].join(" ").toLowerCase();
          return words.every((w) => hay.includes(w));
        });
      }
      return { anzahl: orgs.length, firmen: orgs.slice(0, 80).map((o) => orgShort(o, people)) };
    },
  },
  {
    name: "firma_lesen",
    description: "Alles zu einer Firma: Felder, Notizen, Kommentare, Verlauf, Aufgaben, Termine und Link ins Tool.",
    inputSchema: { type: "object", properties: { firma: FIRMA }, required: ["firma"] },
    annotations: { readOnlyHint: true },
    run: async (a, ctx) => {
      const [o, people] = await Promise.all([findOrg(a.firma), loadPeople()]);
      const [comments, activity, tasks, meetings] = await Promise.all([
        db().from("comments").select("author_id, body, created_at").eq("target_type", "organization").eq("target_id", o.id).order("created_at"),
        db().from("activity").select("actor_id, action, data, created_at").eq("target_type", "organization").eq("target_id", o.id).order("created_at", { ascending: false }).limit(25),
        db().from("tasks").select("id, title, status, assignee_id, due_date").eq("organization_id", o.id).order("due_date"),
        db().from("meetings").select("title, starts_at, private_for").eq("organization_id", o.id).order("starts_at"),
      ]);
      return {
        id: o.id,
        name: o.name,
        link: orgLink(o),
        typ: o.roles.map((r) => ROLE_NAMES[r]).join(", "),
        kategorie: o.category,
        stufe: stageName(o.stage),
        absagegrund: o.lost_reason,
        prio: o.prio,
        welle: o.wave,
        zustaendig: nameOf(people, o.owner_id),
        bestehender_kontakt: o.existing_contact,
        warm_ueber: o.warm_via,
        ansprechperson: o.contact_person,
        kontakt: o.contact_info,
        website: o.url,
        nachfassen: o.next_follow_up,
        ort: o.location,
        kapazitaet: o.capacity,
        uebernachtung: o.overnight,
        preis: o.price,
        betrag_euro: o.amount,
        notizen: o.notes,
        geaendert: fmtWhen(o.updated_at),
        kommentare: (comments.data ?? []).map((c) => ({ von: nameOf(people, c.author_id), wann: fmtWhen(c.created_at), text: c.body })),
        aufgaben: (tasks.data ?? []).map((t) => ({ id: t.id, titel: t.title, status: t.status, zustaendig: nameOf(people, t.assignee_id), faellig: t.due_date })),
        termine: (meetings.data ?? []).filter((m) => visibleMeeting(m, ctx)).map((m) => ({ titel: m.title, wann: fmtWhen(m.starts_at) })),
        verlauf: (activity.data ?? []).map((v) => ({ wer: nameOf(people, v.actor_id), was: v.action, daten: v.data, wann: fmtWhen(v.created_at) })),
      };
    },
  },
  {
    name: "suchen",
    description: "Suche über alles im Tool: Firmen, Aufgaben, Termine, Dokumente, Entscheidungen, Meilensteine. Mehrere Wörter: jedes muss vorkommen.",
    inputSchema: { type: "object", properties: { q: P.text("Suchwörter") }, required: ["q"] },
    annotations: { readOnlyHint: true },
    run: async (a, ctx) => {
      const q = str(a.q) ?? "";
      const hits = await searchAll(db(), q, 8);
      // Private Termine anderer ausblenden (der Secret Key umgeht die Zugriffsregeln)
      const meetingIds = hits.filter((h) => h.type === "meeting").map((h) => h.id);
      let hidden = new Set<string>();
      if (meetingIds.length) {
        const { data } = await db().from("meetings").select("id, private_for").in("id", meetingIds);
        hidden = new Set((data ?? []).filter((m) => !visibleMeeting(m, ctx)).map((m) => m.id));
      }
      return hits
        .filter((h) => !hidden.has(h.id))
        .map((h) => ({ art: h.type, id: h.id, titel: h.title, info: h.meta, stelle: h.snippet, link: `${APP_URL}${h.href}` }));
    },
  },
];

// ------------------------------------------------------------------ Schreiben

/** Feld im Werkzeug → Spalte. log: Wert im Verlauf mitschreiben (kurze Felder). */
const ORG_EDIT: Record<string, { col: keyof Org; label: string; log?: true }> = {
  prio: { col: "prio", label: "Prio A, B oder C; leer = entfernen", log: true },
  zustaendig: { col: "owner_id", label: "Name aus dem Team oder „ich“; leer = niemand", log: true },
  nachfassen: { col: "next_follow_up", label: "Nachfassen am (JJJJ-MM-TT); leer = entfernen", log: true },
  welle: { col: "wave", label: "Welle 1, 2 oder 3; leer = entfernen", log: true },
  ansprechperson: { col: "contact_person", label: "Name und Funktion der Ansprechperson" },
  kontakt: { col: "contact_info", label: "Mail und/oder Telefon" },
  website: { col: "url", label: "Website" },
  warm_ueber: { col: "warm_via", label: "wer im icons-Netzwerk den Kontakt hat" },
  ort: { col: "location", label: "Standort bzw. Adresse" },
  kapazitaet: { col: "capacity", label: "Venue: Kapazität" },
  uebernachtung: { col: "overnight", label: "Venue: Übernachtung möglich?" },
  preis: { col: "price", label: "Venue: Preis" },
  notizen: { col: "notes", label: "ersetzt die ganzen Notizen; zum Ergänzen lieber notiz_anhaengen" },
};

function orgValue(key: string, v: unknown, people: Person[], ctx: Ctx): unknown {
  const s = str(v);
  if (key === "prio") {
    if (!s) return null;
    if (!["A", "B", "C"].includes(s.toUpperCase())) throw new InputError("prio: A, B, C oder leer");
    return s.toUpperCase();
  }
  if (key === "zustaendig") return personId(people, s, ctx);
  if (key === "nachfassen") return date(v, "nachfassen");
  if (key === "welle") {
    if (!s) return null;
    const n = Number(s);
    if (![1, 2, 3].includes(n)) throw new InputError("welle: 1, 2, 3 oder leer");
    return n;
  }
  return s ? s : null;
}

const stamp = (ctx: Ctx) => {
  const [, m, d] = todayInVienna().split("-");
  return `${Number(d)}.${Number(m)}. (${ctx.me.name} über KI)`;
};

const appendNote = (notes: string | null, text: string, ctx: Ctx) => [notes?.trim(), `${stamp(ctx)}: ${text}`].filter(Boolean).join("\n");

async function saveOrg(o: Org, patch: Partial<Org>, ctx: Ctx, people: Person[]) {
  const changed = Object.entries(patch).filter(([k, v]) => (o as Record<string, unknown>)[k] !== v);
  if (!changed.length) return [];
  const { data, error } = await db().from("organizations").update(Object.fromEntries(changed)).eq("id", o.id).select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("nicht gespeichert");
  for (const [col, to] of changed) {
    const short = Object.values(ORG_EDIT).find((f) => f.col === col)?.log;
    await log("organization", o.id, ctx, "updated", short ? { field: col, from: (o as Record<string, unknown>)[col] ?? null, to: to ?? null } : { field: col });
  }
  if (patch.owner_id !== undefined && patch.owner_id !== o.owner_id) await notifyAssignment("organization", o.id, ctx, patch.owner_id);
  return changed.map(([col, to]) => ({ feld: col, vorher: col === "owner_id" ? nameOf(people, o.owner_id) : (o as Record<string, unknown>)[col], nachher: col === "owner_id" ? nameOf(people, to as string | null) : to }));
}

const ROLE_INPUT: Record<string, Role> = { "track-partner": "challenge", supporter: "sponsor", "tech-partner": "tokens", jury: "jury", venue: "venue" };

const write: Tool[] = [
  {
    name: "firma_aendern",
    description:
      "Felder einer Firma ändern. Nur übergebene Felder ändern sich, leerer Text entfernt einen Wert. Für Ergänzungen notiz_anhaengen nutzen (mit Datum und deinem Namen). Kontakte nur aus belegten Quellen.",
    inputSchema: {
      type: "object",
      properties: {
        firma: FIRMA,
        ...Object.fromEntries(Object.entries(ORG_EDIT).map(([k, f]) => [k, P.text(f.label)])),
        notiz_anhaengen: P.text("Zeile, die unten an die Notizen kommt (z. B. Quelle eines Kontakts)"),
      },
      required: ["firma"],
    },
    annotations: { idempotentHint: true },
    run: async (a, ctx) => {
      const [o, people] = await Promise.all([findOrg(a.firma), loadPeople()]);
      const patch: Partial<Org> = {};
      for (const [k, f] of Object.entries(ORG_EDIT)) {
        if (a[k] === undefined) continue;
        (patch as Record<string, unknown>)[f.col] = orgValue(k, a[k], people, ctx);
      }
      const add = str(a.notiz_anhaengen);
      if (add) patch.notes = appendNote(patch.notes !== undefined ? patch.notes : o.notes, add, ctx);
      const changes = await saveOrg(o, patch, ctx, people);
      return { firma: o.name, link: orgLink(o), geaendert: changes.length ? changes : "nichts (Werte waren schon so)" };
    },
  },
  {
    name: "stufe_aendern",
    description:
      "Stufe einer Firma setzen: recherche, kontaktiert oder im_gespraech. „kontaktiert“ nur, wenn die Person bestätigt hat, dass die Nachricht wirklich raus ist; ohne Nachfass-Datum wird es auf in 7 Tagen gesetzt. Zugesagt, Fix und Abgesagt nur in der App.",
    inputSchema: {
      type: "object",
      properties: {
        firma: FIRMA,
        stufe: P.pick(["recherche", "kontaktiert", "im_gespraech"], "neue Stufe"),
        notiz_anhaengen: P.text("optional: was passiert ist, z. B. „Anfrage per Mail an events@… raus“"),
      },
      required: ["firma", "stufe"],
    },
    run: async (a, ctx) => {
      const to = str(a.stufe) as Stage;
      if (!["recherche", "kontaktiert", "im_gespraech"].includes(to)) throw new InputError("stufe: recherche, kontaktiert oder im_gespraech. Zugesagt, Fix und Abgesagt bitte in der App setzen.");
      const [o, people] = await Promise.all([findOrg(a.firma), loadPeople()]);
      if (o.stage === "zugesagt" || o.stage === "fix" || o.stage === "abgesagt") throw new InputError(`${o.name} steht auf ${stageName(o.stage)}. Das bitte in der App ändern (dort hängen Aufgaben dran).`);
      const add = str(a.notiz_anhaengen);
      const follow = to === "kontaktiert" && !o.next_follow_up ? shiftFollowUp(null, todayInVienna(), 7) : null;
      const patch: Partial<Org> = {};
      if (o.stage !== to) patch.stage = to;
      if (follow) patch.next_follow_up = follow;
      if (add) patch.notes = appendNote(o.notes, add, ctx);
      if (!Object.keys(patch).length) return { firma: o.name, stufe: stageName(o.stage), geaendert: "nichts" };
      const { data, error } = await db().from("organizations").update(patch).eq("id", o.id).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("nicht gespeichert");
      if (patch.stage) await log("organization", o.id, ctx, "stage_changed", { from: o.stage, to, ...(follow ? { follow } : {}) });
      if (add) await log("organization", o.id, ctx, "updated", { field: "notes" });
      return { firma: o.name, link: orgLink(o), stufe: `${stageName(o.stage)} → ${stageName(to)}`, nachfassen: follow ?? o.next_follow_up, zustaendig: nameOf(people, o.owner_id) };
    },
  },
  {
    name: "firma_anlegen",
    description: "Neue Firma in der Pipeline anlegen. Prüft vorher, ob es den Namen schon gibt. typ: track-partner, supporter, tech-partner, jury oder venue.",
    inputSchema: {
      type: "object",
      properties: {
        name: P.text("Name der Firma bzw. Venue"),
        typ: P.pick(Object.keys(ROLE_INPUT), "Typ"),
        prio: P.text("A, B oder C"),
        zustaendig: P.text("Name aus dem Team oder „ich“"),
        ansprechperson: P.text("Name und Funktion"),
        kontakt: P.text("Mail und/oder Telefon"),
        website: P.text("Website"),
        ort: P.text("Standort"),
        notizen: P.text("Notizen, mit Quellen"),
      },
      required: ["name", "typ"],
    },
    run: async (a, ctx) => {
      const name = str(a.name);
      if (!name) throw new InputError("name fehlt");
      const role = ROLE_INPUT[str(a.typ) ?? ""];
      if (!role) throw new InputError(`typ: eines von ${Object.keys(ROLE_INPUT).join(", ")}`);
      const people = await loadPeople();
      const same = (await allOrgs()).filter((o) => o.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(o.name.toLowerCase()));
      if (same.length) throw new InputError(`Gibt es vielleicht schon: ${same.map((o) => `${o.name} (${o.id})`).join("; ")}. Dann firma_aendern nutzen.`);
      const row = {
        name,
        roles: [role],
        prio: orgValue("prio", a.prio, people, ctx),
        owner_id: orgValue("zustaendig", a.zustaendig, people, ctx),
        contact_person: str(a.ansprechperson) || null,
        contact_info: str(a.kontakt) || null,
        url: str(a.website) || null,
        location: str(a.ort) || null,
        notes: str(a.notizen) ? appendNote(null, str(a.notizen)!, ctx) : null,
        source: "über KI",
        created_by: ctx.me.id,
      };
      const { data, error } = await db().from("organizations").insert(row).select("id, roles").single();
      if (error) throw error;
      await log("organization", data.id, ctx, "created");
      if (row.owner_id) await notifyAssignment("organization", data.id, ctx, row.owner_id as string);
      return { angelegt: name, id: data.id, link: orgLink(data as Pick<Org, "id" | "roles">) };
    },
  },
  {
    name: "kommentar_schreiben",
    description: "Kommentar an eine Firma schreiben (sieht das Team im Firmen-Detail). Für kurze Updates, Rückfragen und Ergebnisse von Calls.",
    inputSchema: { type: "object", properties: { firma: FIRMA, text: P.text("Kommentar") }, required: ["firma", "text"] },
    run: async (a, ctx) => {
      const text = str(a.text);
      if (!text) throw new InputError("text fehlt");
      const o = await findOrg(a.firma);
      const { error } = await db().from("comments").insert({ target_type: "organization", target_id: o.id, author_id: ctx.me.id, body: `${text}\n\n(über KI)` });
      if (error) throw error;
      return { firma: o.name, link: orgLink(o), kommentar: "gespeichert" };
    },
  },
  {
    name: "aufgabe_anlegen",
    description: "Aufgabe anlegen, optional an einer Firma. zustaendig: Name oder „ich“ (andere bekommen einen Hinweis in der Inbox).",
    inputSchema: {
      type: "object",
      properties: {
        titel: P.text("kurz, mit Verb"),
        zustaendig: P.text("Name aus dem Team oder „ich“"),
        faellig: P.date("fällig am"),
        firma: { ...FIRMA, description: "optional: Firma, zu der die Aufgabe gehört" },
        beschreibung: P.text("optional"),
      },
      required: ["titel"],
    },
    run: async (a, ctx) => {
      const title = str(a.titel);
      if (!title) throw new InputError("titel fehlt");
      const people = await loadPeople();
      const org = a.firma ? await findOrg(a.firma) : null;
      const row = {
        title,
        description: str(a.beschreibung) || null,
        assignee_id: personId(people, a.zustaendig, ctx),
        due_date: date(a.faellig, "faellig") ?? null,
        organization_id: org?.id ?? null,
        created_by: ctx.me.id,
      };
      const { data, error } = await db().from("tasks").insert(row).select("id").single();
      if (error) throw error;
      await log("task", data.id, ctx, "created");
      await notifyAssignment("task", data.id, ctx, row.assignee_id);
      return { angelegt: title, id: data.id, zustaendig: nameOf(people, row.assignee_id), faellig: row.due_date, firma: org?.name ?? null, link: `${APP_URL}/aufgaben?aufgabe=${data.id}` };
    },
  },
  {
    name: "aufgabe_erledigen",
    description: "Aufgabe als erledigt abhaken (id aus ueberblick, firma_lesen oder suchen).",
    inputSchema: { type: "object", properties: { id: P.text("id der Aufgabe") }, required: ["id"] },
    annotations: { idempotentHint: true },
    run: async (a, ctx) => {
      const id = str(a.id);
      if (!id) throw new InputError("id fehlt");
      const { data: t } = await db().from("tasks").select("id, title, status").eq("id", id).maybeSingle();
      if (!t) throw new InputError(`Aufgabe ${id} nicht gefunden`);
      if (t.status === "erledigt") return { aufgabe: t.title, status: "war schon erledigt" };
      const { error } = await db().from("tasks").update({ status: "erledigt", done_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      await log("task", id, ctx, "status_changed", { from: t.status, to: "erledigt" });
      return { aufgabe: t.title, status: "erledigt" };
    },
  },
];

export const TOOLS: Tool[] = [...read, ...write];
