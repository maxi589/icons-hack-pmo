import { addDays, format, parseISO } from "date-fns";
import { daysBetween, formatDayMonth } from "./dates";

// Die 5 Phasen bis zum Hackathon (Design-System, Abschnitt 6.1; Zeitplan vom 14.10.). Start = Beginn der Roadmap.
// Seit 16.10. (Punkt 5) folgen sie den Meilensteinen: Vorbereitung endet mit M1, Akquise mit M3, Bewerbung mit M7,
// Programm am Tag vor M8, Event = M8 und Folgetag. Wer M1 verschiebt, verschiebt die Phase. Die festen Daten unten
// gelten nur, wenn ein Meilenstein fehlt (z. B. gelöscht).

export type Phase = { name: string; start: string; end: string; label: string };

export const PHASES: readonly Phase[] = [
  { name: "Vorbereitung", start: "2026-10-01", end: "2026-11-01", label: "bis 1.11." },
  { name: "Akquise", start: "2026-11-02", end: "2026-12-18", label: "bis 18.12." },
  { name: "Bewerbung", start: "2026-12-19", end: "2027-01-22", label: "bis 22.1." },
  { name: "Programm", start: "2027-01-23", end: "2027-02-26", label: "bis 26.2." },
  { name: "Event", start: "2027-02-27", end: "2027-02-28", label: "27.–28.2." },
];

type Due = { id: string; due_date: string };
const dueOf = (list: readonly Due[] | null | undefined, id: string) => list?.find((m) => m.id === id)?.due_date;
const plus = (d: string, n: number) => format(addDays(parseISO(d), n), "yyyy-MM-dd");
const later = (a: string, b: string) => (a > b ? a : b);

/** Phasen aus den Meilenstein-Daten; jede Phase dauert mindestens einen Tag, auch wenn Daten durcheinander geraten. */
export function phasesFor(list?: readonly Due[] | null): Phase[] {
  const e1 = dueOf(list, "M1") ?? PHASES[0].end;
  const e2 = later(dueOf(list, "M3") ?? PHASES[1].end, plus(e1, 1));
  const e3 = later(dueOf(list, "M7") ?? PHASES[2].end, plus(e2, 1));
  const ev = later(dueOf(list, "M8") ?? PHASES[4].start, plus(e3, 2));
  const evEnd = plus(ev, 1);
  return [
    { name: "Vorbereitung", start: PHASES[0].start, end: e1, label: `bis ${formatDayMonth(e1)}` },
    { name: "Akquise", start: plus(e1, 1), end: e2, label: `bis ${formatDayMonth(e2)}` },
    { name: "Bewerbung", start: plus(e2, 1), end: e3, label: `bis ${formatDayMonth(e3)}` },
    { name: "Programm", start: plus(e3, 1), end: plus(ev, -1), label: `bis ${formatDayMonth(plus(ev, -1))}` },
    {
      name: "Event",
      start: ev,
      end: evEnd,
      // „27.–28.2.“, über einen Monatswechsel „31.1.–1.2.“
      label: `${ev.slice(0, 7) === evEnd.slice(0, 7) ? formatDayMonth(ev).replace(/\.\d+\.$/, ".") : formatDayMonth(ev)}–${formatDayMonth(evEnd)}`,
    },
  ];
}

/** Index der aktuellen Phase (0–4); vor dem Start 0, nach dem Event 4. */
export function currentPhase(today: string, phases: readonly Phase[] = PHASES) {
  const i = phases.findIndex((p) => today <= p.end);
  return i === -1 ? phases.length - 1 : i;
}

/** Füllstand 0–1 einer Phase am Tag `today`. */
export function phaseFill(i: number, today: string, phases: readonly Phase[] = PHASES) {
  const p = phases[i];
  if (today > p.end) return 1;
  if (today < p.start) return 0;
  return (daysBetween(p.start, today) + 1) / (daysBetween(p.start, p.end) + 1);
}

// Outreach: Start Welle 1 und die Nachfass-Runden (stammdaten.json). Die Runden sind ein fester Takt des Teams.
// Neuer Zeitplan ab 28.10. (Zeitplan_27-10.md im OneDrive-Ordner): Wellen im Wochentakt ab 2.11., deshalb jeden Montag
// vom 16.11. bis 7.12. eine Runde (Welle 1: 16. und 30.11., Welle 2 und 3: 23.11. und 7.12.).
export const WAVE_1 = "2026-11-02";
/** Start Welle 1 = Datum von M3.1 (folgt dem Meilenstein, Rückfall WAVE_1). */
export const wave1For = (list?: readonly Due[] | null) => dueOf(list, "M3.1") ?? WAVE_1;
export const FOLLOW_UP_ROUNDS = ["2026-11-16", "2026-11-23", "2026-11-30", "2026-12-07"];
