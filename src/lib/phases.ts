import { daysBetween } from "./dates";

// Die 5 Phasen bis zum Hackathon (Design-System, Abschnitt 6.1). Start der Vorbereitung = Beginn der Roadmap.
export const PHASES = [
  { name: "Vorbereitung", start: "2026-10-01", end: "2026-10-18", label: "bis 18.10." },
  { name: "Outreach", start: "2026-10-19", end: "2026-12-18", label: "bis 18.12." },
  { name: "Jury", start: "2026-12-19", end: "2027-01-15", label: "bis 15.1." },
  { name: "Anmeldung", start: "2027-01-16", end: "2027-02-23", label: "bis 23.2." },
  { name: "Event", start: "2027-02-24", end: "2027-02-28", label: "27.–28.2." },
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
