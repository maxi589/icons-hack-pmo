import { addDays, format, parseISO } from "date-fns";
import { daysBetween } from "./dates";

// Aufgaben: Status, Sortierung und Gruppen (Umfang v1: Titel, Status, zuständig, Fälligkeit, Bereich, Meilenstein).

export type TaskStatus = "offen" | "laeuft" | "erledigt";

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  assignee_id: string | null;
  due_date: string | null;
  area_id: string | null;
  milestone_id: string | null;
  done_at: string | null;
  created_by: string | null;
  created_at: string;
};

/** Status nie nur über Farbe: Punkt plus Wort. */
export const TASK_STATUSES: { id: TaskStatus; name: string; dot: string }[] = [
  { id: "offen", name: "Offen", dot: "bg-st-gray" },
  { id: "laeuft", name: "In Arbeit", dot: "bg-st-blue" },
  { id: "erledigt", name: "Erledigt", dot: "bg-st-green" },
];

export const taskStatusName = (s: TaskStatus) => TASK_STATUSES.find((x) => x.id === s)!.name;

/** Fällige zuerst, ohne Frist ans Ende, dann nach Anlage. */
export function sortTasks(a: Task, b: Task) {
  const da = a.due_date ?? "9999";
  const db = b.due_date ?? "9999";
  if (da !== db) return da.localeCompare(db);
  return a.created_at.localeCompare(b.created_at);
}

export type DueGroup = "overdue" | "today" | "week" | "later" | "none";

export const DUE_GROUPS: { id: DueGroup; name: string }[] = [
  { id: "overdue", name: "Überfällig" },
  { id: "today", name: "Heute" },
  { id: "week", name: "Nächste 7 Tage" },
  { id: "later", name: "Später" },
  { id: "none", name: "Ohne Frist" },
];

export function dueGroup(t: Task, today: string): DueGroup {
  if (!t.due_date) return "none";
  const n = daysBetween(today, t.due_date);
  if (n < 0) return "overdue";
  if (n === 0) return "today";
  return n <= 7 ? "week" : "later";
}

/** Frist um n Tage verschieben, ausgehend von heute bzw. der Frist, falls die in der Zukunft liegt. */
export function shiftDue(current: string | null, today: string, days: number) {
  const base = current && current > today ? current : today;
  return format(addDays(parseISO(base), days), "yyyy-MM-dd");
}

/** Meilensteine für Auswahllisten: Hauptmeilensteine nach Datum, die Unterpunkte jeweils direkt darunter. */
export function milestoneOptions<M extends { id: string; parent_id: string | null }>(list: M[]): M[] {
  return list.filter((m) => !m.parent_id).flatMap((m) => [m, ...list.filter((s) => s.parent_id === m.id)]);
}
