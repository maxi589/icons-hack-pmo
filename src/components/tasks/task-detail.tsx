"use client";

import Link from "next/link";
import { ArrowUpRight, Trash2, X } from "lucide-react";
import { CopyLinkButton } from "@/components/copy-link-button";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/avatar";
import { DueChip } from "@/components/chip";
import { Feed } from "@/components/feed";
import { EditText, miniButton, PropRow, SelectBox } from "@/components/detail-fields";
import { useTeam } from "@/components/app-shell/team-provider";
import { notifyAssignment } from "@/lib/data/use-feed";
import type { TaskPatch } from "@/lib/data/use-tasks";
import type { Milestone } from "@/lib/data/use-milestones";
import { milestoneOptions, shiftDue, TASK_STATUSES, taskStatusName, type Task, type TaskStatus } from "@/lib/tasks";
import { StatusCheck } from "./status-check";

// Aufgaben-Detail (rechts 400px wie in der Pipeline; am Handy als Bottom Sheet).
// Auswahlfelder speichern sofort, Textfelder beim Verlassen. Status mit „Rückgängig“ über die Seite.

export function TaskDetail({
  task,
  today,
  milestones,
  onUpdate,
  onStatus,
  onDelete,
  onClose,
}: {
  task: Task;
  today: string;
  milestones: Milestone[];
  onUpdate: (patch: TaskPatch) => void;
  onStatus: (to: TaskStatus) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const { me, people, personById, allAreas } = useTeam();
  const f = (name: string) => `task-${task.id}-${name}`;
  const done = task.status === "erledigt";

  return (
    <div className="flex flex-col">
      {/* Kopf */}
      <div className="flex flex-col gap-3 border-b border-line px-[18px] pt-4 pb-3.5">
        <div className="flex items-start gap-2">
          <span className="pt-1.5">
            <StatusCheck status={task.status} title={task.title} onToggle={() => onStatus(done ? "offen" : "erledigt")} />
          </span>
          <h2 className="min-w-0 flex-1">
            <span className="sr-only">Titel</span>
            <EditText
              id={f("title")}
              value={task.title}
              placeholder="Titel"
              required
              wrap
              onSave={(v) => v && onUpdate({ title: v })}
              className={cn("text-base font-semibold tracking-[-0.01em] md:text-base", done && "text-fg-2 line-through")}
            />
          </h2>
          <CopyLinkButton path={`/aufgaben?aufgabe=${task.id}`} label="Link zu dieser Aufgabe kopieren" />
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 shrink-0 place-items-center rounded-lg text-fg-3 hover:bg-hover hover:text-fg max-md:size-11"
            aria-label="Detail schließen"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        {/* Status: drei Knöpfe, am Handy 44px hoch */}
        <div role="radiogroup" aria-label="Status" className="grid grid-cols-3 gap-1 rounded-[10px] p-[3px] shadow-[inset_0_0_0_1px_var(--line2)]">
          {TASK_STATUSES.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={task.status === s.id}
              onClick={() => onStatus(s.id)}
              className={cn(
                "inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] text-[14px] text-fg-2 transition-colors duration-150 hover:text-fg md:min-h-7 md:text-[12.5px]",
                task.status === s.id && "bg-active font-medium text-fg"
              )}
            >
              <span className={cn("size-[7px] rounded-full", s.dot)} aria-hidden />
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Eigenschaften */}
      <div className="flex flex-col border-b border-line px-[18px] py-2.5">
        <PropRow label="Zuständig" htmlFor={f("assignee")}>
          <span className="flex items-center gap-1">
            <Avatar person={personById(task.assignee_id)} size={20} />
            <span className="flex-1">
              <SelectBox
                id={f("assignee")}
                value={task.assignee_id ?? ""}
                onChange={(v) => {
                  onUpdate({ assignee_id: v || null });
                  notifyAssignment("task", task.id, me?.id ?? null, v || null);
                }}
              >
                <option value="">Noch offen</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </SelectBox>
            </span>
          </span>
        </PropRow>
        <PropRow label="Fällig" htmlFor={f("due")}>
          <span className="flex flex-wrap items-center gap-1.5">
            <input
              id={f("due")}
              type="date"
              value={task.due_date ?? ""}
              onChange={(e) => onUpdate({ due_date: e.target.value || null })}
              className="h-8 rounded-lg bg-transparent px-2 text-[13px] text-fg tabular hover:bg-hover"
            />
            {!done && (
              <>
                <button type="button" className={miniButton} onClick={() => onUpdate({ due_date: shiftDue(task.due_date, today, 2) })}>
                  +2 Tage
                </button>
                <button type="button" className={miniButton} onClick={() => onUpdate({ due_date: shiftDue(task.due_date, today, 7) })}>
                  +1 Woche
                </button>
              </>
            )}
            {task.due_date && !done && <DueChip due={task.due_date} today={today} />}
          </span>
        </PropRow>
        <PropRow label="Bereich" htmlFor={f("area")}>
          <span className="flex items-center gap-1">
            <span
              className="ml-1.5 size-[7px] shrink-0 rounded-full bg-line-2"
              style={allAreas.find((a) => a.id === task.area_id) ? { background: allAreas.find((a) => a.id === task.area_id)!.color } : undefined}
              aria-hidden
            />
            <span className="flex-1">
              <SelectBox id={f("area")} value={task.area_id ?? ""} onChange={(v) => onUpdate({ area_id: v || null })}>
                <option value="">Kein Bereich</option>
                {allAreas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </SelectBox>
            </span>
          </span>
        </PropRow>
        <PropRow label="Meilenstein" htmlFor={f("ms")}>
          <span className="flex items-center gap-1">
            <span className="flex-1">
              <SelectBox
                id={f("ms")}
                value={task.milestone_id ?? ""}
                onChange={(v) => {
                  // Ohne Bereich übernimmt die Aufgabe den Bereich des Meilensteins.
                  const ms = milestones.find((m) => m.id === v);
                  onUpdate({ milestone_id: v || null, ...(ms && !task.area_id ? { area_id: ms.area_id } : {}) });
                }}
              >
                <option value="">Kein Meilenstein</option>
                {milestoneOptions(milestones).map((m) => (
                  <option key={m.id} value={m.id}>
                    {`${m.parent_id ? "   " : ""}${m.id} · ${m.title}`}
                  </option>
                ))}
              </SelectBox>
            </span>
            {task.milestone_id && (
              <Link
                href={`/roadmap?m=${task.milestone_id}`}
                className="grid size-8 shrink-0 place-items-center rounded-lg text-fg-3 hover:bg-hover hover:text-fg"
                aria-label={`Meilenstein ${task.milestone_id} in der Roadmap öffnen`}
              >
                <ArrowUpRight className="size-3.5" aria-hidden />
              </Link>
            )}
          </span>
        </PropRow>
        <div className="flex flex-col gap-1 py-1.5">
          <label htmlFor={f("desc")} className="text-[13px] text-fg-3">
            Beschreibung
          </label>
          <EditText
            id={f("desc")}
            value={task.description}
            placeholder="Was genau ist zu tun? Links, Absprachen …"
            onSave={(v) => onUpdate({ description: v })}
            multiline
          />
        </div>
        <div className="flex justify-end pb-1">
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] text-fg-3 transition-colors duration-150 hover:bg-hover hover:text-st-red max-md:min-h-11"
          >
            <Trash2 className="size-3.5" aria-hidden />
            Aufgabe löschen
          </button>
        </div>
      </div>

      {/* Verlauf und Kommentare */}
      <div className="px-[18px] pt-3.5 pb-6">
        <Feed
          targetType="task"
          targetId={task.id}
          describe={(a) =>
            a.action === "status_changed"
              ? `hat den Status auf ${taskStatusName(a.data.to as TaskStatus)} gesetzt`
              : a.action === "created"
                ? "hat die Aufgabe angelegt"
                : a.action
          }
        />
      </div>
    </div>
  );
}
