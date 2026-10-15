import { CalendarDays, FileText, Flag, House, Inbox, Kanban, List, NotebookPen, type LucideIcon } from "lucide-react";

// Hauptnavigation (Sidebar, Handy-Menü, Strg+K).

export type NavItem = { href: string; label: string; Icon: LucideIcon };

export const NAV_MAIN: NavItem[] = [
  { href: "/", label: "Übersicht", Icon: House },
  { href: "/inbox", label: "Inbox", Icon: Inbox },
  { href: "/fuer-mich", label: "Für mich", Icon: NotebookPen },
];

export const NAV_HACKATHON: NavItem[] = [
  { href: "/termine", label: "Termine", Icon: CalendarDays },
  { href: "/roadmap", label: "Roadmap", Icon: Flag },
  { href: "/pipeline", label: "Pipeline", Icon: Kanban },
  { href: "/aufgaben", label: "Aufgaben", Icon: List },
  { href: "/dokumente", label: "Dokumente", Icon: FileText },
];

export const NAV_ALL = [...NAV_MAIN, ...NAV_HACKATHON];

// Neu anlegen: führt vorerst auf die passende Seite, das Formular kommt mit der jeweiligen Seite.
export const NEW_ACTIONS = [
  { href: "/aufgaben?neu=1", label: "Neue Aufgabe" },
  { href: "/termine?neu=1", label: "Neuer Termin" },
  { href: "/pipeline?neu=1", label: "Firma zur Pipeline hinzufügen" },
  { href: "/dokumente?neu=dokument", label: "Neues Dokument" },
  { href: "/dokumente?neu=entscheidung", label: "Entscheidung festhalten" },
] as const;

// Die 5 Bereiche (Tabelle `areas`, ohne Sammelzeile „Gesamtleitung“ = id vorbereitung). Feste IDs, damit die
// Seiten vorab gebaut werden. Namen in der Datenbank: Venue & Event, Track-Partner, Sponsoren, Programm & Jury,
// Marketing & Teilnehmer.
export const AREA_IDS = ["venue", "partner", "sponsoren", "jury", "marketing"] as const;

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
