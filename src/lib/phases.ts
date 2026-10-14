import { daysBetween } from "./dates";

// Die 5 Phasen bis zum Hackathon (Design-System, Abschnitt 6.1; Zeitplan vom 14.10.). Start = Beginn der Roadmap.
export const PHASES = [
  { name: "Vorbereitung", start: "2026-10-01", end: "2026-10-18", label: "bis 18.10." },
  { name: "Akquise", start: "2026-10-19", end: "2026-12-18", label: "bis 18.12." },
  { name: "Bewerbung", start: "2026-12-19", end: "2027-01-22", label: "bis 22.1." },
  { name: "Programm", start: "2027-01-23", end: "2027-02-26", label: "bis 26.2." },
  { name: "Event", start: "2027-02-27", end: "2027-02-28", label: "27.–28.2." },
] as const;

/** Index der aktuellen Phase (0–4); vor dem Start 0, nach dem Event 4. */
export function currentPhase(today: string) {
  const i = PHASES.findIndex((p) => today <= p.end);
  return i === -1 ? PHASES.length - 1 : i;
}

/** Füllstand 0–1 einer Phase am Tag `today`. */
export function phaseFill(i: number, today: string) {
  const p = PHASES[i];
  if (today > p.end) return 1;
  if (today < p.start) return 0;
  return (daysBetween(p.start, today) + 1) / (daysBetween(p.start, p.end) + 1);
}

// Outreach: Start Welle 1 und die drei Nachfass-Runden (stammdaten.json).
export const WAVE_1 = "2026-10-19";
export const FOLLOW_UP_ROUNDS = ["2026-11-02", "2026-11-16", "2026-11-30"];
