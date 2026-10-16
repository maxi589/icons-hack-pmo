"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/avatar";
import { useTeam } from "@/components/app-shell/team-provider";
import { formatShort } from "@/lib/dates";
import type { Milestone } from "@/lib/data/use-milestones";

// Unterpunkte eines Meilensteins zum Abhaken (Übersicht und Roadmap).
// Ganze Zeile ist der Knopf (Tippfläche ≥ 44px am Handy). Zuständig = Verantwortliche/r des Bereichs.
export function MilestoneChecklist({
  items,
  onToggle,
  showDate = false,
  showId = false,
  children,
}: {
  items: Milestone[];
  onToggle: (id: string, done: boolean) => void;
  showDate?: boolean;
  showId?: boolean;
  /** Weitere Zeilen in derselben Liste (Roadmap-Cockpit: Aufgaben und „+ Aufgabe“) */
  children?: React.ReactNode;
}) {
  const { areaById, personById } = useTeam();
  return (
    <ul className="flex flex-col overflow-hidden rounded-[10px] shadow-[0_0_0_1px_var(--line)]">
      {items.map((m) => {
        const area = areaById(m.area_id);
        const isDone = m.status === "erledigt";
        return (
          <li key={m.id} className="border-t border-line first:border-t-0">
            <button
              type="button"
              aria-pressed={isDone}
              onClick={() => onToggle(m.id, !isDone)}
              className="flex min-h-11 w-full items-center gap-2.5 px-3 text-left text-[13px] transition-colors duration-150 hover:bg-hover md:min-h-[38px]"
            >
              <span
                className={cn(
                  "grid size-3.5 shrink-0 place-items-center rounded-full border-[1.5px] transition-colors duration-200",
                  isDone ? "border-acc-line bg-acc-line text-bg" : "border-line-2"
                )}
                aria-hidden
              >
                {isDone && <Check className="size-2.5" strokeWidth={3.5} />}
              </span>
              {/* Nummer am Handy nur für Screenreader, damit der Titel Platz hat */}
              <span className={cn("w-[34px] shrink-0 font-mono text-[11.5px] text-fg-3", showId ? "max-sm:sr-only" : "sr-only")}>{m.id}</span>
              <span className={cn("min-w-0 flex-1 truncate", isDone && "text-fg-3 line-through")}>{m.title}</span>
              {showDate && <span className="shrink-0 text-[11.5px] text-fg-3 tabular">{formatShort(m.due_date)}</span>}
              <span className="size-[7px] shrink-0 rounded-full" style={{ background: area?.color }} title={area?.name} aria-hidden />
              <Avatar person={personById(area?.owner_id)} size={22} />
            </button>
          </li>
        );
      })}
      {children}
    </ul>
  );
}
