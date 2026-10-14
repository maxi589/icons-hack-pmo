import { addDays, format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { TIME_ZONE } from "./dates";

// Termine (Plan Welle 1, Schritt 3). Beginn ist ein echter Zeitpunkt (timestamptz), angezeigt immer in Wien.
// Deshalb rutscht nichts über die Zeitumstellung am 25.10.: 10:00 bleibt 10:00 Wiener Zeit.

export type Meeting = {
  id: string;
  title: string;
  starts_at: string;
  duration_min: number;
  location: string | null;
  meet_url: string | null;
  area_id: string | null;
  organization_id: string | null;
  attendees: string[];
  agenda: string;
  agenda_updated_at: string | null;
  agenda_updated_by: string | null;
  notes: string;
  notes_updated_at: string | null;
  notes_updated_by: string | null;
  created_by: string | null;
  created_at: string;
};

export type MeetingPatch = Partial<Omit<Meeting, "id" | "created_at">>;

export const DURATIONS = [15, 30, 45, 60, 90, 120, 180];

const partsFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Wiener Datum und Uhrzeit eines Zeitpunkts: { date: "2026-10-20", time: "09:30", minutes: 570 } */
export function viennaParts(iso: string | Date) {
  const p = Object.fromEntries(partsFmt.formatToParts(typeof iso === "string" ? new Date(iso) : iso).map((x) => [x.type, x.value]));
  const time = `${p.hour}:${p.minute}`;
  return { date: `${p.year}-${p.month}-${p.day}`, time, minutes: Number(p.hour) * 60 + Number(p.minute) };
}

/** Wiener Datum + Uhrzeit → Zeitpunkt (ISO, UTC). Funktioniert auch an den Tagen der Zeitumstellung. */
export function fromVienna(date: string, time: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  const wall = Date.UTC(y, m - 1, d, h, min);
  // Abstand Wien ↔ UTC an diesem Zeitpunkt bestimmen (zweimal, falls die erste Schätzung über die Umstellung fällt).
  let guess = wall;
  for (let i = 0; i < 2; i++) {
    const p = viennaParts(new Date(guess));
    const [py, pm, pd] = p.date.split("-").map(Number);
    const shown = Date.UTC(py, pm - 1, pd, Math.floor(p.minutes / 60), p.minutes % 60);
    guess = guess + (wall - shown);
  }
  return new Date(guess).toISOString();
}

export const endOf = (m: Pick<Meeting, "starts_at" | "duration_min">) => new Date(new Date(m.starts_at).getTime() + m.duration_min * 60_000);

/** „09:30–10:30“ */
export function timeRange(m: Pick<Meeting, "starts_at" | "duration_min">) {
  return `${viennaParts(m.starts_at).time}–${viennaParts(endOf(m)).time}`;
}

export function durationLabel(min: number) {
  if (min < 60) return `${min} min`;
  const h = min / 60;
  return `${String(h).replace(".", ",")} h`;
}

/** Montag der Woche (reines Datum). */
export function weekStart(date: string) {
  const d = parseISO(date);
  const shift = (d.getDay() + 6) % 7;
  return format(addDays(d, -shift), "yyyy-MM-dd");
}

export const plusDays = (date: string, n: number) => format(addDays(parseISO(date), n), "yyyy-MM-dd");

/** „12.–18. Oktober 2026“ bzw. „26. Okt. – 1. Nov. 2026“ */
export function weekLabel(monday: string) {
  const a = parseISO(monday);
  const b = addDays(a, 6);
  if (a.getMonth() === b.getMonth()) return `${format(a, "d.")}–${format(b, "d. MMMM yyyy", { locale: de })}`;
  return `${format(a, "d. MMM", { locale: de })} – ${format(b, "d. MMM yyyy", { locale: de })}`;
}

export const meetingHref = (id: string) => `/termine?termin=${id}`;

/** Video-Link? Dann „Beitreten“ statt Ort. */
export function isMeetLink(url: string | null) {
  return !!url && /^https?:\/\//i.test(url);
}

/** Offene Checklisten-Punkte aus Markdown („- [ ] …“), für „Nächsten Termin anlegen“. */
export function openItems(markdown: string) {
  return markdown
    .split("\n")
    .map((l) => l.match(/^\s*[-*+]\s+\[ \]\s+(.+)$/)?.[1]?.trim())
    .filter((x): x is string => !!x);
}

/**
 * „In Google Kalender eintragen“: öffnet Google Kalender mit vorausgefülltem Termin.
 * Gäste über `add` (kommagetrennte Mails). Google verschickt dann Einladung und Erinnerung, das Tool keine Mails.
 */
export function googleCalendarUrl(m: Meeting, opts: { link: string; guests: string[] }) {
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const details = [m.meet_url ? `Meet: ${m.meet_url}` : "", `Agenda und Notizen: ${opts.link}`].filter(Boolean).join("\n");
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: m.title,
    dates: `${stamp(new Date(m.starts_at))}/${stamp(endOf(m))}`,
    details,
    ctz: TIME_ZONE,
  });
  const where = m.location || m.meet_url;
  if (where) q.set("location", where);
  if (opts.guests.length) q.set("add", opts.guests.join(","));
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}
