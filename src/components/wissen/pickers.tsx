"use client";

import { cn } from "@/lib/utils";
import { Avatar } from "@/components/avatar";
import { useTeam } from "@/components/app-shell/team-provider";
import type { TargetType } from "@/lib/links";

// Auswahl-Bausteine für Entscheidungen: wer hat entschieden (mehrere), womit hängt es zusammen (ein Thema).

export function PeoplePicker({
  value,
  onChange,
  size = "md",
  label = "Wer hat entschieden",
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  size?: "sm" | "md";
  label?: string;
}) {
  const { people } = useTeam();
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
      {people.map((p) => {
        const on = value.includes(p.id);
        return (
          <button
            key={p.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((x) => x !== p.id) : [...value, p.id])}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full pr-2.5 pl-1 transition-colors duration-150 max-md:h-10 max-md:text-[14px]",
              size === "sm" ? "h-[26px] text-[12px]" : "h-8 text-[13px]",
              on ? "bg-active text-fg shadow-[inset_0_0_0_1px_var(--line2)]" : "text-fg-3 shadow-[inset_0_0_0_1px_var(--line)] hover:text-fg-2"
            )}
          >
            <span className={cn("transition-opacity duration-150", !on && "opacity-40")}>
              <Avatar person={p} size={size === "sm" ? 18 : 22} />
            </span>
            {p.name}
          </button>
        );
      })}
    </div>
  );
}

export type Topic = { type: TargetType; id: string; label: string };

const GROUPS: { type: TargetType; name: string }[] = [
  { type: "milestone", name: "Meilensteine" },
  { type: "organization", name: "Pipeline" },
  { type: "task", name: "Aufgaben" },
  { type: "meeting", name: "Termine" },
];

/** Wert im Format „typ:id“, leer = kein Thema. */
export const topicValue = (type: TargetType | null, id: string | null) => (type && id ? `${type}:${id}` : "");

export function parseTopic(v: string): { target_type: TargetType | null; target_id: string | null } {
  if (!v) return { target_type: null, target_id: null };
  const i = v.indexOf(":");
  return { target_type: v.slice(0, i) as TargetType, target_id: v.slice(i + 1) };
}

export function TopicOptions({ topics }: { topics: Topic[] }) {
  return (
    <>
      <option value="">Kein Thema</option>
      {GROUPS.map((g) => {
        const list = topics.filter((t) => t.type === g.type);
        if (!list.length) return null;
        return (
          <optgroup key={g.type} label={g.name}>
            {list.map((t) => (
              <option key={t.id} value={topicValue(t.type, t.id)}>
                {t.label}
              </option>
            ))}
          </optgroup>
        );
      })}
    </>
  );
}
