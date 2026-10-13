import { daysBetween } from "./dates";

// Zeitachse der Roadmap: 1.10.2026 bis 28.2.2027 (151 Tage), Monate proportional (Design-System 6.2).
export const AXIS_START = "2026-10-01";
export const AXIS_DAYS = 151;

export const MONTHS = [
  { name: "Oktober", start: "2026-10-01", days: 31 },
  { name: "November", start: "2026-11-01", days: 30 },
  { name: "Dezember", start: "2026-12-01", days: 31 },
  { name: "Januar", start: "2027-01-01", days: 31 },
  { name: "Februar", start: "2027-02-01", days: 28 },
];

/** Position eines Tages auf der Achse in Prozent (Mitte des Tages). */
export function axisPos(isoDate: string) {
  const d = Math.min(Math.max(daysBetween(AXIS_START, isoDate), 0), AXIS_DAYS - 1);
  return ((d + 0.5) / AXIS_DAYS) * 100;
}

/** Linker Rand eines Tages in Prozent (für Monatsgrenzen und Balken). */
export function axisEdge(isoDate: string) {
  return (Math.min(Math.max(daysBetween(AXIS_START, isoDate), 0), AXIS_DAYS) / AXIS_DAYS) * 100;
}

// Zeiträume ohne eigenen Meilenstein. M2 und M3 kommen mit start_date aus der Datenbank.
export const PLAN_BARS = [
  { areaId: "sponsoren", from: "2026-11-16", to: "2026-12-18", label: "Welle 3 Sponsoren bis zur Fixierung", faint: true },
  { areaId: "teilnehmer", from: "2027-02-05", to: "2027-02-23", label: "Anmeldung (Luma) bis zur Auswahl", faint: false },
];
