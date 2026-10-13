// Alle Kalenderdaten gelten in Europe/Vienna. Fristen und Nachfass-Termine sind reine Daten (YYYY-MM-DD).

export const TIME_ZONE = "Europe/Vienna";
export const EVENT_START = "2027-02-27";

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
