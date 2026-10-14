import { BookOpen, CircleCheck, Flag, House, Inbox, Kanban, List, type LucideIcon } from "lucide-react";

// Hauptnavigation. `key` ist das Tastenkürzel nach „G“ (z. B. G R = Roadmap).

export type NavItem = { href: string; label: string; Icon: LucideIcon; key: string };

export const NAV_MAIN: NavItem[] = [
  { href: "/", label: "Übersicht", Icon: House, key: "U" },
  { href: "/inbox", label: "Inbox", Icon: Inbox, key: "I" },
  { href: "/meine-aufgaben", label: "Meine Aufgaben", Icon: CircleCheck, key: "M" },
];

export const NAV_HACKATHON: NavItem[] = [
  { href: "/roadmap", label: "Roadmap", Icon: Flag, key: "R" },
  { href: "/pipeline", label: "Pipeline", Icon: Kanban, key: "P" },
  { href: "/aufgaben", label: "Aufgaben", Icon: List, key: "A" },
  { href: "/wissen", label: "Wissen", Icon: BookOpen, key: "W" },
];

export const NAV_ALL = [...NAV_MAIN, ...NAV_HACKATHON];

// Neu anlegen: führt vorerst auf die passende Seite, das Formular kommt mit der jeweiligen Seite.
export const NEW_ACTIONS = [
  { href: "/aufgaben?neu=1", label: "Neue Aufgabe", key: "C" },
  { href: "/pipeline?neu=1", label: "Firma zur Pipeline hinzufügen", key: "F" },
  { href: "/wissen?neu=1", label: "Entscheidung festhalten", key: "E" },
] as const;

// Die 5 Bereiche (Tabelle `areas`, ohne Sammelzeile „Gesamtleitung“ = id vorbereitung). Feste IDs, damit die
// Seiten vorab gebaut werden. Namen in der Datenbank: Venue & Event, Track-Partner, Sponsoren, Programm & Jury,
// Marketing & Teilnehmer.
export const AREA_IDS = ["venue", "partner", "sponsoren", "jury", "marketing"] as const;

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
