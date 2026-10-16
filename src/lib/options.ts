import type { SelectOption } from "@/components/ui/select";
import { DURATIONS, durationLabel } from "@/lib/meetings";
import { milestoneOptions } from "@/lib/tasks";

// Häufige Listen für das Auswahlfeld (`@/components/ui/select`). Leerer Wert "" = nichts gewählt.

/** Personen, Bereiche, Firmen …: „Keiner“ zuerst, dann alle Namen. */
export const nameOptions = (list: { id: string; name: string }[], empty: string): SelectOption[] => [
  { value: "", label: empty },
  ...list.map((x) => ({ value: x.id, label: x.name })),
];

export const PRIO_OPTIONS: SelectOption[] = [{ value: "", label: "Keine" }, ...["A", "B", "C"].map((p) => ({ value: p, label: p }))];

/** Meilensteine mit eingerückten Unterpunkten (M1, M1.1, M1.2, M2 …). */
export const msSelectOptions = (milestones: { id: string; parent_id: string | null; title: string }[], empty: string): SelectOption[] => [
  { value: "", label: empty },
  ...milestoneOptions(milestones).map((m) => ({ value: m.id, label: `${m.id} · ${m.title}`, indent: !!m.parent_id })),
];

/** Termindauern; eine abweichende aktuelle Dauer kommt mit in die Liste. */
export const durationOptions = (current: number): SelectOption[] =>
  [...new Set([...DURATIONS, current])].sort((a, b) => a - b).map((d) => ({ value: String(d), label: durationLabel(d) }));
