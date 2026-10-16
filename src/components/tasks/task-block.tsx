"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/avatar";
import { DueChip } from "@/components/chip";
import { useTeam } from "@/components/app-shell/team-provider";
import { useToday } from "@/lib/use-today";
import { useTasks } from "@/lib/data/use-tasks";
import { useMilestones } from "@/lib/data/use-milestones";
import { sortTasks, type Task } from "@/lib/tasks";
import { NewTaskDialog } from "./new-task-dialog";
import { StatusCheck } from "./status-check";
import { useTaskActions } from "./use-task-actions";

// Block „Aufgaben“ dort, wo man arbeitet (Firmen-Detail): offene Aufgaben zum Abhaken (mit Rückgängig), Erledigte
// eingeklappt, „+ Aufgabe“ mit vorbelegter Firma, Bereich und Zuständig. Bearbeiten im Detail auf der Aufgaben-Seite.

export type TaskDefaults = {
  area_id?: string | null;
  assignee_id?: string | null;
  milestone_id?: string | null;
  organization_id?: string | null;
};

export function TaskBlock({
  match,
  defaults,
  context,
  variant = "card",
}: {
  /** Welche Aufgaben hierher gehören */
  match: (t: Task) => boolean;
  defaults: TaskDefaults;
  /** Zeile unter dem Dialog-Titel, z. B. der Firmenname */
  context?: string;
  /** card = eigene Karte, plain = Abschnitt im Detail-Panel (Firma) */
  variant?: "card" | "plain";
}) {
  const today = useToday();
  const { personById } = useTeam();
  const api = useTasks();
  const { milestones } = useMilestones();
  const { toggleDone, createTask } = useTaskActions(api);
  const [creating, setCreating] = useState(false);
  const [showDone, setShowDone] = useState(false);

  if (!api.tasks || !today) return null;
  const mine = api.tasks.filter(match);
  const open = mine.filter((t) => t.status !== "erledigt").sort(sortTasks);
  const done = mine.filter((t) => t.status === "erledigt").sort((a, b) => (b.done_at ?? "").localeCompare(a.done_at ?? ""));
  const href = (id: string) => `/aufgaben?aufgabe=${id}`;

  const row = (t: Task) => {
    const isDone = t.status === "erledigt";
    return (
      <li key={t.id} className="relative flex min-h-11 items-center gap-2.5 border-t border-line px-3.5 py-1.5 first:border-t-0 hover:bg-hover max-md:min-h-12">
        <StatusCheck status={t.status} title={t.title} onToggle={() => toggleDone(t)} />
        <Link
          href={href(t.id)}
          className={cn("min-w-0 flex-1 truncate rounded-sm text-[13.5px] after:absolute after:inset-0 max-md:text-[15px]", isDone && "text-fg-2 line-through")}
        >
          {t.title}
        </Link>
        {t.due_date && !isDone && <DueChip due={t.due_date} today={today} />}
        <Avatar person={personById(t.assignee_id)} size={20} />
      </li>
    );
  };

  return (
    <section aria-label="Aufgaben" className={cn("min-w-0", variant === "card" ? "overflow-hidden rounded-[14px] bg-card shadow-card" : "")}>
      <div className={cn("flex items-center justify-between gap-2", variant === "card" ? "px-4 pt-4 pb-3" : "pb-2")}>
        <h2 className={cn("flex items-center gap-2 font-semibold", variant === "card" ? "text-[14px]" : "text-[13px]")}>
          Aufgaben
          {open.length > 0 && <span className="font-normal text-fg-3 tabular">{open.length} offen</span>}
        </h2>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex h-8 items-center gap-1.5 rounded-[9px] px-2.5 text-[12.5px] font-medium text-fg-2 shadow-[inset_0_0_0_1px_var(--line2)] transition-colors duration-150 hover:bg-hover hover:text-fg max-md:h-11"
        >
          <Plus className="size-3.5" aria-hidden />
          Aufgabe
        </button>
      </div>
      {open.length === 0 && done.length === 0 ? (
        <p className={cn("text-[13px] text-fg-3", variant === "card" ? "border-t border-line px-4 py-3.5" : "")}>Keine Aufgaben.</p>
      ) : (
        <div className={cn("flex flex-col", variant === "card" ? "border-t border-line" : "gap-1.5")}>
          {open.length > 0 ? (
            <ul className={cn(variant === "plain" && "overflow-hidden rounded-[10px] shadow-[0_0_0_1px_var(--line)]")}>{open.map(row)}</ul>
          ) : (
            <p className={cn("text-[13px] text-fg-3", variant === "card" && "px-4 py-3.5")}>Alles erledigt.</p>
          )}
          {done.length > 0 && (
            <>
              <button
                type="button"
                aria-expanded={showDone}
                onClick={() => setShowDone((v) => !v)}
                className={cn(
                  "flex min-h-8 items-center gap-2 rounded-md text-[12.5px] text-fg-2 hover:text-fg max-md:min-h-11",
                  variant === "card" ? "border-t border-line px-4" : "self-start px-1"
                )}
              >
                <span className="size-2 rounded-full bg-st-green" aria-hidden />
                {done.length} erledigt
                <ChevronDown className={cn("size-3.5 text-fg-3 transition-transform duration-200", showDone && "rotate-180")} aria-hidden />
              </button>
              {showDone && (
                <ul className={cn(variant === "plain" ? "overflow-hidden rounded-[10px] shadow-[0_0_0_1px_var(--line)]" : "border-t border-line")}>{done.map(row)}</ul>
              )}
            </>
          )}
        </div>
      )}
      <NewTaskDialog
        open={creating}
        onOpenChange={setCreating}
        milestones={milestones ?? []}
        context={context}
        defaults={defaults}
        onCreate={async (input) => !!(await createTask({ ...input, organization_id: defaults.organization_id ?? null }, href))}
      />
    </section>
  );
}
