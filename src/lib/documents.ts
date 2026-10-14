import { ExternalLink, FileText, FileAudio, File, FileImage, FileSpreadsheet, Presentation, PenTool, Calendar, Folder, Palette, BookOpen, Link2, Gavel, type LucideIcon } from "lucide-react";

// Dokumente (Plan Welle 1, Schritt 2): Arten, Erkennung von Links an der Adresse, Hilfen für Anzeige.

export type DocumentKind = "link" | "file" | "text" | "transcript";
export type DocTarget = "milestone" | "organization" | "task";

export type Doc = {
  id: string;
  kind: DocumentKind;
  title: string;
  url: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  mime: string | null;
  content: string;
  area_id: string | null;
  target_type: DocTarget | null;
  target_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
};

export type DocPatch = Partial<Omit<Doc, "id" | "created_at">>;

/** Was in der Liste als Art steht und welches Symbol es bekommt. */
export type DocType = { label: string; Icon: LucideIcon };

const LINK_TYPES: { test: RegExp; type: DocType }[] = [
  { test: /docs\.google\.com\/document/, type: { label: "Doc", Icon: FileText } },
  { test: /docs\.google\.com\/presentation/, type: { label: "Slides", Icon: Presentation } },
  { test: /docs\.google\.com\/spreadsheets/, type: { label: "Tabelle", Icon: FileSpreadsheet } },
  { test: /docs\.google\.com\/forms/, type: { label: "Formular", Icon: FileText } },
  { test: /drive\.google\.com/, type: { label: "Drive", Icon: Folder } },
  { test: /figma\.com/, type: { label: "Figma", Icon: PenTool } },
  { test: /canva\.com/, type: { label: "Canva", Icon: Palette } },
  { test: /notion\.(so|site)/, type: { label: "Notion", Icon: BookOpen } },
  { test: /lu\.ma|luma\.com/, type: { label: "Luma", Icon: Calendar } },
];

export function docType(d: Pick<Doc, "kind" | "url" | "mime" | "file_name">): DocType {
  if (d.kind === "text") return { label: "Text", Icon: FileText };
  if (d.kind === "transcript") return { label: "Transkript", Icon: FileAudio };
  if (d.kind === "file") {
    const name = d.file_name?.toLowerCase() ?? "";
    if (d.mime?.startsWith("image/")) return { label: "Bild", Icon: FileImage };
    if (name.endsWith(".pdf")) return { label: "PDF", Icon: File };
    if (/\.(pptx?|key)$/.test(name)) return { label: "Präsentation", Icon: Presentation };
    if (/\.(xlsx?|csv)$/.test(name)) return { label: "Tabelle", Icon: FileSpreadsheet };
    return { label: "Datei", Icon: File };
  }
  const url = d.url ?? "";
  return LINK_TYPES.find((t) => t.test.test(url))?.type ?? { label: "Link", Icon: Link2 };
}

export const DECISION_TYPE: DocType = { label: "Entscheidung", Icon: Gavel };
export const OPEN_ICON = ExternalLink;

/** Adresse aufräumen: „luma.com/…“ → „https://luma.com/…“. null, wenn es keine Adresse ist. */
export function normalizeUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s || /\s/.test(s)) return null;
  const withProto = /^https?:\/\//i.test(s) ? s : /^[\w-]+(\.[\w-]+)+(\/|$|\?|#)/.test(s) ? `https://${s}` : null;
  if (!withProto) return null;
  try {
    return new URL(withProto).toString();
  } catch {
    return null;
  }
}

/** Titel-Vorschlag aus der Adresse (Google & Co. verraten den echten Titel nicht ohne Anmeldung). */
export function titleFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const t = docType({ kind: "link", url, mime: null, file_name: null });
    if (t.label !== "Link") return `${t.label} (${host})`;
    const last = decodeURIComponent(u.pathname.split("/").filter(Boolean).pop() ?? "")
      .replace(/\.[a-z0-9]{2,4}$/i, "")
      .replace(/[-_]+/g, " ")
      .trim();
    return last && !/^[\w-]{20,}$/.test(last) ? `${last.charAt(0).toUpperCase()}${last.slice(1)}` : host;
  } catch {
    return url;
  }
}

export function hostOf(url: string | null) {
  if (!url) return "";
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

/** Transkripte (.vtt/.srt/.txt/.md) als lesbaren Text übernehmen: Zeitmarken und Nummern raus. */
export function transcriptText(raw: string, name: string) {
  if (!/\.(vtt|srt)$/i.test(name)) return raw.trim();
  return raw
    .replace(/^WEBVTT.*$/m, "")
    .split(/\r?\n/)
    .filter((l) => !/^\d+$/.test(l.trim()) && !/-->/.test(l) && !/^(NOTE|STYLE)\b/.test(l))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const MAX_FILE_BYTES = 50 * 1024 * 1024;
export const docHref = (id: string) => `/dokumente?dok=${id}`;
export const NEW_TITLE = "Ohne Titel";
