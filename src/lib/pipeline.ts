import { addDays, format, parseISO } from "date-fns";
import { daysBetween, formatShort } from "./dates";

// Pipeline: Stufen, Tabs und kleine Helfer (Design-System 6.3, Partner- und Venue-Analyse in docs/daten).

export type Stage = "recherche" | "kontaktiert" | "im_gespraech" | "zugesagt" | "fix" | "abgesagt";
export type Role = "challenge" | "sponsor" | "jury" | "tokens" | "venue";
export type Prio = "A" | "B" | "C";

export type Organization = {
  id: string;
  name: string;
  roles: Role[];
  category: string | null;
  location: string | null;
  prio: Prio | null;
  wave: number | null;
  stage: Stage;
  lost_reason: string | null;
  owner_id: string | null;
  existing_contact: string | null;
  warm_via: string | null;
  contact_person: string | null;
  contact_info: string | null;
  url: string | null;
  next_follow_up: string | null;
  notes: string | null;
  capacity: string | null;
  overnight: string | null;
  price: string | null;
  source: string | null;
  created_at: string;
};

/** Farbe als Tailwind-Klasse (Punkt) und Text-Klasse; Status nie nur über Farbe, immer mit Wort. */
export const STAGES: { id: Stage; name: string; dot: string; text: string }[] = [
  { id: "recherche", name: "Recherche", dot: "bg-st-gray", text: "text-st-gray" },
  { id: "kontaktiert", name: "Kontaktiert", dot: "bg-st-blue", text: "text-st-blue" },
  { id: "im_gespraech", name: "Im Gespräch", dot: "bg-st-amber", text: "text-st-amber" },
  { id: "zugesagt", name: "Zugesagt", dot: "bg-st-green", text: "text-st-green" },
  { id: "fix", name: "Fix", dot: "bg-st-green", text: "text-st-green" },
  { id: "abgesagt", name: "Abgesagt", dot: "bg-st-red", text: "text-st-red" },
];

export const stageName = (s: Stage) => STAGES.find((x) => x.id === s)!.name;

/** Nächste Stufe für „Weiter zu …“ (nach Fix und Abgesagt keine). */
export function nextStage(s: Stage): Stage | null {
  const order: Stage[] = ["recherche", "kontaktiert", "im_gespraech", "zugesagt", "fix"];
  const i = order.indexOf(s);
  return i >= 0 && i < order.length - 1 ? order[i + 1] : null;
}

export const ROLE_NAMES: Record<Role, string> = {
  challenge: "Track-Partner",
  sponsor: "Supporter",
  jury: "Jury & Ecosystem",
  tokens: "Tech-Partner",
  venue: "Venue",
};

export type TabId = "partner" | "sponsoren" | "jury" | "venues";

/** Tabs je Typ, Begriffe wie auf der Website. Sponsoren = Tech-Partner (Credits) + Supporter. Ziel null = „Ziel offen“. */
export const TABS: {
  id: TabId;
  name: string;
  /** Kurzname für die Tab-Leiste am Handy (alle 4 Tabs ohne Wischen sichtbar). */
  short: string;
  roles: Role[];
  goalLabel: string;
  goal: number | null;
  goalStages: Stage[];
}[] = [
  { id: "partner", name: "Track-Partner", short: "Tracks", roles: ["challenge"], goalLabel: "Track-Partner", goal: 4, goalStages: ["zugesagt", "fix"] },
  { id: "sponsoren", name: "Sponsoren", short: "Sponsoren", roles: ["sponsor", "tokens"], goalLabel: "Sponsoren", goal: null, goalStages: ["zugesagt", "fix"] },
  { id: "jury", name: "Jury & Ecosystem", short: "Jury", roles: ["jury"], goalLabel: "Jury", goal: 4, goalStages: ["zugesagt", "fix"] },
  { id: "venues", name: "Venues", short: "Venues", roles: ["venue"], goalLabel: "Venue fixiert", goal: 1, goalStages: ["fix"] },
];

export const inTab = (o: Organization, tab: TabId) => o.roles.some((r) => TABS.find((t) => t.id === tab)!.roles.includes(r));

export function initials(name: string) {
  // Nur Wörter, die mit Buchstabe oder Ziffer beginnen („Horváth & Partners“ → HP, nicht H&).
  const words = name.replace(/^Test · /, "").split(/[\s-]+/).filter((w) => /^[\p{L}\p{N}]/u.test(w));
  return (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase();
}

/** Zweite Kartenzeile: „warm über Kilian · Welle 1“. Leer, wenn weder Kontakt noch Welle bekannt. */
export function warmLine(o: Organization) {
  const warm = o.warm_via ? `warm über ${o.warm_via}` : (o.existing_contact ?? "");
  return [warm, o.wave ? `Welle ${o.wave}` : ""].filter(Boolean).join(" · ");
}

export type FollowState = { tone: "today" | "red" | "gray"; label: string } | null;

/** Nachfass-Chip: heute (Kobalt), überfällig (rot), sonst Datum. Bei Fix/Abgesagt keiner. */
export function followState(o: Organization, today: string): FollowState {
  if (!o.next_follow_up || o.stage === "fix" || o.stage === "abgesagt") return null;
  const n = daysBetween(today, o.next_follow_up);
  if (n === 0) return { tone: "today", label: "heute" };
  if (n < 0) return { tone: "red", label: `überfällig seit ${format(parseISO(o.next_follow_up), "d.M.")}` };
  return { tone: "gray", label: formatShort(o.next_follow_up) };
}

/** Nachfass-Datum verschieben, ausgehend von heute bzw. dem gesetzten Termin, falls der in der Zukunft liegt. */
export function shiftFollowUp(current: string | null, today: string, days: number) {
  const base = current && current > today ? current : today;
  return format(addDays(parseISO(base), days), "yyyy-MM-dd");
}
