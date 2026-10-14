import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";

// Alle Kalenderdaten gelten in Europe/Vienna. Fristen und Nachfass-Termine sind reine Daten (YYYY-MM-DD).

export const TIME_ZONE = "Europe/Vienna";
export const EVENT_START = "2027-02-27";
/** Startzeitpunkt für die Live-Uhr: Sa 27.2.2027, 09:00 Wien (Winterzeit, = 08:00 UTC). Maxi, 14.10.: „erstmal 09:00“. */
export const EVENT_START_UTC = Date.UTC(2027, 1, 27, 8, 0, 0);
export const EVENT_START_LABEL = "Sa 27.2.2027, 09:00";

/** Heutiges Datum in Wien als YYYY-MM-DD. */
export function todayInVienna(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Ganze Kalendertage von heute (Wien) bis zum Datum. Unabhängig von Uhrzeit und Sommerzeit. */
export function daysUntil(isoDate: string, now: Date = new Date()): number {
  const toUtcDay = (d: string) => {
    const [y, m, day] = d.split("-").map(Number);
    return Date.UTC(y, m - 1, day);
  };
  return Math.round((toUtcDay(isoDate) - toUtcDay(todayInVienna(now))) / 86_400_000);
}

// ---------------------------------------------------------------
// Formatierung (date-fns, Locale de). Reine Daten (YYYY-MM-DD) werden als lokaler Tag gelesen
// und wieder als lokaler Tag ausgegeben, dadurch verschiebt sich nichts über die Zeitzone.
// ---------------------------------------------------------------

/** „So, 18.10.“ */
export function formatShort(isoDate: string) {
  return format(parseISO(isoDate), "EEEEEE, d.M.", { locale: de });
}

/** „Dienstag, 13. Oktober“ */
export function formatLong(isoDate: string) {
  return format(parseISO(isoDate), "EEEE, d. MMMM", { locale: de });
}

/** „Di, 13. Oktober“ (Handy-Kopfzeile) */
export function formatHeaderDate(isoDate: string) {
  return format(parseISO(isoDate), "EEEEEE, d. MMMM", { locale: de });
}

/** „18.10.“ */
export function formatDayMonth(isoDate: string) {
  return format(parseISO(isoDate), "d.M.", { locale: de });
}

/** „heute“, „morgen“, „in 5 Tagen“, „gestern“, „vor 3 Tagen“ */
export function relativeDays(isoDate: string, today: string) {
  const n = daysBetween(today, isoDate);
  if (n === 0) return "heute";
  if (n === 1) return "morgen";
  if (n === -1) return "gestern";
  return n > 0 ? `in ${n} Tagen` : `vor ${-n} Tagen`;
}

/** Ganze Tage zwischen zwei reinen Daten (b − a). */
export function daysBetween(a: string, b: string) {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86_400_000);
}

/** Stunde (0–23) in Wien, für die Begrüßung. */
export function hourInVienna(now: Date = new Date()) {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", hourCycle: "h23" }).format(now));
}
