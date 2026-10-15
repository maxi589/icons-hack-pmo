import type { SupabaseClient } from "@supabase/supabase-js";
import { formatDayMonth, formatShort } from "@/lib/dates";
import { docType, type DocumentKind } from "@/lib/documents";
import { targetHref } from "@/lib/links";
import { mdToText } from "@/lib/markdown";
import { viennaParts } from "@/lib/meetings";
import { stageName, type Stage } from "@/lib/pipeline";

// Suche über alles (Strg+K, Welle 1 Schritt 5). Sucht nach Wortteilen statt mit der deutschen Volltextsuche,
// damit beim Tippen schon „Erst“ die „Erste Bank“ findet. Mehrere Wörter: Jedes muss irgendwo im Eintrag vorkommen.
// Läuft mit jedem Supabase-Client (Browser mit RLS, später auch Assistent bzw. MCP auf dem Server).

export type HitType = "organization" | "task" | "meeting" | "document" | "decision" | "milestone" | "area";

export type Hit = {
  type: HitType;
  id: string;
  title: string;
  href: string;
  /** kurz rechts: Stufe, Datum, Art … */
  meta: string;
  /** Textstelle, wenn das Wort nicht im Titel steht */
  snippet: string | null;
  /** 0–1, Titel-Treffer vor Treffern im Text */
  score: number;
  /** alle durchsuchten Felder klein geschrieben, damit die Liste beim Weitertippen sofort filtern kann */
  hay: string;
  /** nur Dokumente: Art für das Symbol */
  doc?: { kind: DocumentKind; url: string | null; mime: string | null; file_name: string | null };
  done?: boolean;
};

const MAX_WORDS = 5;

/** „Erste  Bank,“ → ["erste", "bank"]. Zeichen, die die Abfrage stören würden, fallen weg. */
export function searchWords(q: string): string[] {
  const words = q
    .toLowerCase()
    .replace(/[%*,()"\\]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  return [...new Set(words)].slice(0, MAX_WORDS);
}

export const matchesAll = (hay: string, words: string[]) => words.every((w) => hay.includes(w));

type Row = Record<string, unknown>;
type Source = {
  type: HitType;
  table: string;
  select: string;
  /** die ersten `titleFields` Felder (Standard 1) zählen als Titel, der Rest als Text */
  fields: string[];
  titleFields?: number;
  /** Felder aus dem Editor (Markdown): zählen nur mit ihrem Text, nicht mit Link-Adressen („pipeline“, IDs) oder
   *  Tabellen-Strichen. Nur echte Markdown-Felder, Klartext (Firmen-Notizen, Aufgaben …) bleibt unverändert. */
  md?: string[];
  order: { column: string; ascending: boolean };
  limit: number;
  toHit: (r: Row) => Pick<Hit, "id" | "title" | "href" | "meta"> & Partial<Pick<Hit, "doc" | "done">>;
};

const str = (v: unknown) => (typeof v === "string" ? v : "");

const SOURCES: Source[] = [
  {
    type: "organization",
    table: "organizations",
    select: "id, name, stage, contact_person, contact_info, notes, location, category, warm_via, existing_contact, url, lost_reason",
    fields: ["name", "contact_person", "contact_info", "notes", "location", "category", "warm_via", "existing_contact", "url", "lost_reason"],
    order: { column: "name", ascending: true },
    limit: 12,
    toHit: (r) => ({ id: str(r.id), title: str(r.name), href: targetHref("organization", str(r.id)), meta: stageName(r.stage as Stage) }),
  },
  {
    type: "task",
    table: "tasks",
    select: "id, title, description, status, due_date",
    fields: ["title", "description"],
    order: { column: "updated_at", ascending: false },
    limit: 12,
    toHit: (r) => ({
      id: str(r.id),
      title: str(r.title),
      href: targetHref("task", str(r.id)),
      meta: r.status === "erledigt" ? "erledigt" : r.due_date ? formatShort(str(r.due_date)) : "",
      done: r.status === "erledigt",
    }),
  },
  {
    type: "meeting",
    table: "meetings",
    select: "id, title, starts_at, location, agenda, notes",
    fields: ["title", "location", "agenda", "notes"],
    md: ["agenda", "notes"],
    order: { column: "starts_at", ascending: false },
    limit: 12,
    toHit: (r) => {
      const p = viennaParts(str(r.starts_at));
      return { id: str(r.id), title: str(r.title), href: targetHref("meeting", str(r.id)), meta: `${formatShort(p.date)} · ${p.time}` };
    },
  },
  {
    // Text kann lang sein (Transkripte), deshalb weniger Zeilen
    type: "document",
    table: "documents",
    select: "id, kind, title, url, file_name, mime, content",
    fields: ["title", "file_name", "url", "content"],
    md: ["content"],
    order: { column: "updated_at", ascending: false },
    limit: 8,
    toHit: (r) => {
      const doc = { kind: r.kind as DocumentKind, url: r.url as string | null, mime: r.mime as string | null, file_name: r.file_name as string | null };
      return { id: str(r.id), title: str(r.title), href: targetHref("document", str(r.id)), meta: docType(doc).label, doc };
    },
  },
  {
    type: "decision",
    table: "decisions",
    select: "id, title, reason, decided_on",
    fields: ["title", "reason"],
    order: { column: "decided_on", ascending: false },
    limit: 12,
    toHit: (r) => ({ id: str(r.id), title: str(r.title), href: targetHref("decision", str(r.id)), meta: formatDayMonth(str(r.decided_on)) }),
  },
  {
    type: "milestone",
    table: "milestones",
    select: "id, title, description, due_date",
    fields: ["title", "id", "description"],
    titleFields: 2, // „M1.2“ findet den Meilenstein wie ein Titel
    order: { column: "due_date", ascending: true },
    limit: 12,
    toHit: (r) => ({ id: str(r.id), title: str(r.title), href: targetHref("milestone", str(r.id)), meta: str(r.id) }),
  },
  {
    type: "area",
    table: "areas",
    select: "id, name, notes",
    fields: ["name", "notes"],
    md: ["notes"],
    order: { column: "sort", ascending: true },
    limit: 6,
    toHit: (r) => ({ id: str(r.id), title: str(r.name), href: `/bereiche/${str(r.id)}`, meta: "Notizen" }),
  },
];

/** Ausschnitt von ca. 90 Zeichen rund um das erste gefundene Wort (Markdown ist schon Klartext, siehe `md`). */
function snippetOf(text: string, words: string[]) {
  const t = text.replace(/\s+/g, " ").trim();
  const lower = t.toLowerCase();
  const at = Math.min(...words.map((w) => lower.indexOf(w)).filter((i) => i >= 0));
  if (!Number.isFinite(at)) return null;
  let start = Math.max(0, at - 30);
  if (start > 0) start = t.indexOf(" ", start) + 1 || start;
  const end = Math.min(t.length, start + 90);
  return `${start > 0 ? "…" : ""}${t.slice(start, end).trim()}${end < t.length ? " …" : ""}`;
}

function rank(source: Source, r: Row, words: string[]): Hit | null {
  // Die Datenbank sucht im Rohtext; hier fallen Treffer weg, die nur in einer Link-Adresse stehen.
  const values = source.fields.map((f) => (source.md?.includes(f) ? mdToText(str(r[f])) : str(r[f])));
  const hay = values.join("\n").toLowerCase();
  if (!matchesAll(hay, words)) return null;
  const n = source.titleFields ?? 1;
  const title = values.slice(0, n).join(" ").toLowerCase();
  const inTitle = words.filter((w) => title.includes(w)).length;
  // Titel genau gleich (z. B. „M1“): 0,7 · ganz im Titel: 0,6 (Titel beginnt damit: 0,65) · teilweise: 0,45 · nur im Text: 0,3
  const exact = values.slice(0, n).some((v) => v.toLowerCase() === words.join(" "));
  let score = exact ? 0.7 : inTitle === words.length ? (title.startsWith(words[0]) ? 0.65 : 0.6) : inTitle > 0 ? 0.45 : 0.3;
  if (source.type === "area" && inTitle === words.length) return null; // steht schon als Bereich in Strg+K
  if (source.type === "task" && r.status === "erledigt") score -= 0.05;

  let snippet: string | null = null;
  if (inTitle < words.length) {
    const rest = words.filter((w) => !title.includes(w));
    const field = values.slice(n).find((v) => rest.some((w) => v.toLowerCase().includes(w)));
    if (field) snippet = snippetOf(field, rest);
  }
  return { ...source.toHit(r), type: source.type, snippet, score, hay };
}

/** Sucht in allen Inhalten. Pro Art höchstens `perType` Treffer, beste zuerst. */
export async function searchAll(db: SupabaseClient, q: string, perType = 5): Promise<Hit[]> {
  const words = searchWords(q);
  if (words.join("").length < 2) return [];

  const results = await Promise.all(
    SOURCES.map(async (s) => {
      let query = db.from(s.table).select(s.select);
      // Jedes Wort muss in irgendeinem Feld stehen (UND über die Wörter, ODER über die Felder).
      for (const w of words) query = query.or(s.fields.map((f) => `${f}.ilike."*${w}*"`).join(","));
      // Die Datenbank sucht im Rohtext. Bei Markdown mehr Zeilen holen, weil reine Adress-Treffer erst danach wegfallen.
      const { data, error } = await query.order(s.order.column, { ascending: s.order.ascending }).limit(s.md ? s.limit * 3 : s.limit);
      if (error || !data) return [];
      return (data as unknown as Row[])
        .map((r) => rank(s, r, words))
        .filter((h): h is Hit => !!h)
        .sort((a, b) => b.score - a.score)
        .slice(0, perType);
    })
  );
  return results.flat();
}
