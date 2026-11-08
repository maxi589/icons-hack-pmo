import { daysBetween } from "./dates";
import { KEY } from "./key-milestones";

// Zeitachse der Roadmap: 1.10.2026 bis 31.3.2027 (182 Tage), Monate proportional (Design-System 6.2).
// Seit 8.11. bis Ende März, weil der Debrief (M10) am 7.3. liegt.
export const AXIS_START = "2026-10-01";
export const AXIS_END = "2027-03-31";
export const AXIS_DAYS = 182;

export const MONTHS = [
  { name: "Oktober", start: "2026-10-01", days: 31 },
  { name: "November", start: "2026-11-01", days: 30 },
  { name: "Dezember", start: "2026-12-01", days: 31 },
  { name: "Januar", start: "2027-01-01", days: 31 },
  { name: "Februar", start: "2027-02-01", days: 28 },
  { name: "März", start: "2027-03-01", days: 31 },
];

/** Pausen im Plan (Maxi D, 8.11.): als schraffiertes Band im Zeitstrahl mit Legende und als Hinweis in der Liste. */
export const BREAKS = [{ from: "2026-12-19", to: "2027-01-10", label: "Weihnachtspause", note: "Outreach schwer" }];

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
// Seit 16.10. (Punkt 5) folgen sie den Meilensteinen (key-milestones.ts): Welle 3 von M4.3 bis M4, Bewerbung von M6 bis M8.
// Die festen Daten gelten nur, wenn ein Meilenstein fehlt.
export const PLAN_BARS = [
  { areaId: "sponsoren", from: "2026-12-07", to: "2027-01-29", label: "Welle 3 Sponsoren bis zur Fixierung", faint: true, fromId: KEY.sponsorWave, toId: KEY.partners },
  { areaId: "marketing", from: "2027-02-01", to: "2027-02-23", label: "Anmeldung (Luma) bis zur Auswahl", faint: false, fromId: KEY.public, toId: KEY.selection },
];

export function planBarsFor(list?: readonly { id: string; due_date: string }[] | null) {
  const due = (id: string) => list?.find((m) => m.id === id)?.due_date;
  return PLAN_BARS.map(({ fromId, toId, ...b }) => {
    const from = due(fromId) ?? b.from;
    const to = due(toId) ?? b.to;
    return { ...b, from, to: to < from ? from : to };
  });
}
