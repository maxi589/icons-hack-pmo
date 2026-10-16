"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, Check, ChevronDown, MessageSquare, Plus, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/avatar";
import { Chip, DueChip } from "@/components/chip";
import { MilestoneChecklist } from "@/components/milestone-checklist";
import { CopyLinkButton } from "@/components/copy-link-button";
import { CompactFeed, Composer } from "@/components/feed";
import { EditText } from "@/components/detail-fields";
import { StatusCheck } from "@/components/tasks/status-check";
import { useTeam } from "@/components/app-shell/team-provider";
import { formatShort } from "@/lib/dates";
import { sortTasks, type Task } from "@/lib/tasks";
import type { Milestone } from "@/lib/data/use-milestones";
import { DATE_MAX, DATE_MIN, describeMilestone, shiftDays } from "./use-milestone-edit";

// Roadmap-Cockpit (Entwurf Chat 18, Maxi 16.10.): links der Meilenstein (Titel, Beschreibung und Datum direkt änderbar,
// „verschoben +X T“, Erledigt, Kommentar in einer Zeile, kurzer Verlauf), rechts „Gehört dazu“: Unterpunkte und
// Aufgaben zum Abhaken plus „+ Aufgabe“. Unter dem Zeitstrahl als Detail-Panel (Verlauf offen), in der Liste als Karte
// (Kommentare aufklappbar, damit nicht alle Verläufe gleichzeitig laden), am Handy im Sheet.

const ghostBtn =
  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[9px] px-3 text-[13px] font-medium text-fg-2 shadow-[inset_0_0_0_1px_var(--line2)] transition-[background,color,scale] duration-150 hover:bg-hover hover:text-fg active:scale-[.97] max-md:h-11";

export function MilestoneDetail({
  milestone: m,
  subs,
  parent,
  tasks,
  today,
  onToggle,
  onToggleTask,
  onNewTask,
  onDate,
  onText,
  onSelect,
  highlighted = false,
  as: Tag = "section",
  feed = "toggle",
  onClose,
}: {
  milestone: Milestone;
  subs: Milestone[];
  parent: Milestone | null;
  /** Aufgaben, die an diesem Meilenstein hängen */
  tasks: Task[];
  today: string;
  onToggle: (id: string, done: boolean) => void;
  onToggleTask: (t: Task) => void;
  onNewTask: () => void;
  onDate: (to: string) => void;
  onText: (field: "title" | "description", value: string | null) => void;
  onSelect?: (id: string) => void;
  highlighted?: boolean;
  as?: "section" | "article";
  feed?: "open" | "toggle";
  /** Im Handy-Sheet: ohne Kartenrahmen, mit „Detail schließen“ in der Kopfzeile */
  onClose?: () => void;
}) {
  const { areaById, personById } = useTeam();
  const area = areaById(m.area_id);
  const owner = personById(area?.owner_id);
  const done = m.status === "erledigt";
  const [feedOpen, setFeedOpen] = useState(highlighted);
  const showFeed = feed === "open" || feedOpen;
  const shift = shiftDays(m);
  const f = (name: string) => `ms-${m.id}-${name}`;

  const sortedTasks = [...tasks.filter((t) => t.status !== "erledigt").sort(sortTasks), ...tasks.filter((t) => t.status === "erledigt")];
  const total = subs.length + tasks.length;
  const doneCount = subs.filter((s) => s.status === "erledigt").length + tasks.filter((t) => t.status === "erledigt").length;

  return (
    <Tag
      id={`ms-${m.id}`}
      className={cn(
        "flex scroll-mt-4 flex-wrap items-start gap-x-6 gap-y-4",
        onClose ? "px-4 pt-2 pb-6" : "rounded-[14px] bg-card p-4 md:px-[22px] md:py-[18px]",
        !onClose && (highlighted ? "shadow-[0_0_0_1.5px_var(--accLine)]" : "shadow-card")
      )}
    >
      <div className="flex min-w-0 flex-[1.4_1_420px] flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[12.5px] text-fg-2">
          <span className="font-mono text-fg-3">{m.id}</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-[7px] rounded-full" style={{ background: area?.color }} aria-hidden />
            {area?.name}
          </span>
          {parent && (
            <span className="text-fg-3">
              Teil von{" "}
              {onSelect ? (
                <button
                  type="button"
                  onClick={() => onSelect(parent.id)}
                  title={parent.title}
                  className="relative rounded-sm text-fg-2 underline decoration-line-2 underline-offset-4 hover:text-fg max-md:after:absolute max-md:after:-inset-x-2 max-md:after:-inset-y-3"
                >
                  {parent.id}
                </button>
              ) : (
                <span className="text-fg-2" title={parent.title}>
                  {parent.id}
                </span>
              )}
            </span>
          )}
          <CopyLinkButton path={`/roadmap?m=${m.id}`} label={`Link zu ${m.id} kopieren`} className="-my-1 ml-auto" />
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="-my-1.5 -mr-2 grid size-11 place-items-center rounded-lg text-fg-3 hover:bg-hover hover:text-fg"
              aria-label="Detail schließen"
            >
              <X className="size-[18px]" aria-hidden />
            </button>
          )}
        </div>

        {/* Titel und Beschreibung sehen aus wie Text, ein Klick macht sie änderbar (speichern beim Verlassen) */}
        <h2 className="-mx-2">
          <span className="sr-only">Titel</span>
          <EditText
            id={f("title")}
            value={m.title}
            placeholder="Titel"
            required
            wrap
            onSave={(v) => onText("title", v)}
            className={cn("text-[17px] leading-[1.3] font-semibold tracking-[-0.015em] md:text-[19px]", done && "text-fg-2")}
          />
        </h2>
        <div className="-mx-2">
          <label htmlFor={f("desc")} className="sr-only">
            Beschreibung
          </label>
          <EditText
            id={f("desc")}
            value={m.description}
            placeholder="Beschreibung …"
            multiline
            onSave={(v) => onText("description", v)}
            className="field-sizing-content min-h-8 resize-none py-1 text-[14px] leading-[1.55] text-fg-2 md:text-[14px]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12.5px] text-fg-2">
          <DateField id={f("due")} value={m.due_date} min={m.start_date ?? undefined} onCommit={onDate} />
          {done ? (
            <Chip tone="green">
              <Check className="size-3" strokeWidth={3} aria-hidden />
              erledigt
            </Chip>
          ) : (
            <DueChip due={m.due_date} today={today} />
          )}
          {shift !== 0 && m.baseline_due && (
            <span title={`Geplant war ${formatShort(m.baseline_due)}`}>
              <Chip tone={shift > 0 ? "amber" : "gray"}>verschoben {shift > 0 ? `+${shift}` : `−${-shift}`} T</Chip>
              <span className="sr-only">, geplant war {formatShort(m.baseline_due)}</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Avatar person={owner} size={20} />
            {owner ? (
              <span>
                <span className="sr-only">Verantwortlich: </span>
                {owner.name}
              </span>
            ) : (
              <span className="text-st-amber">Verantwortlich offen</span>
            )}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1.5">
          {done ? (
            <button type="button" onClick={() => onToggle(m.id, false)} className={ghostBtn}>
              <RotateCcw className="size-3.5" aria-hidden />
              Wieder öffnen
            </button>
          ) : (
            <button type="button" onClick={() => onToggle(m.id, true)} className={ghostBtn}>
              <Check className="size-3.5 text-acc-line" strokeWidth={2.4} aria-hidden />
              Erledigt
            </button>
          )}
          {feed === "open" ? (
            <Composer variant="line" targetType="milestone" targetId={m.id} />
          ) : (
            <button type="button" onClick={() => setFeedOpen((o) => !o)} aria-expanded={feedOpen} className={ghostBtn}>
              <MessageSquare className="size-3.5" aria-hidden />
              Kommentare
              <ChevronDown className={cn("size-3.5 transition-transform duration-200 motion-reduce:transition-none", feedOpen && "rotate-180")} aria-hidden />
            </button>
          )}
        </div>
        {feed === "toggle" && feedOpen && (
          <div className="flex pt-1">
            <Composer variant="line" targetType="milestone" targetId={m.id} />
          </div>
        )}
        {showFeed && (
          <div className="pt-2">
            <CompactFeed targetType="milestone" targetId={m.id} describe={describeMilestone} />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-2">
        <h3 className="label-mono flex items-center justify-between">
          Gehört dazu
          {total > 0 && (
            <span className="tabular">
              <span aria-hidden>
                {doneCount}/{total}
              </span>
              <span className="sr-only">
                {doneCount} von {total} erledigt
              </span>
            </span>
          )}
        </h3>
        <MilestoneChecklist items={subs} onToggle={onToggle} showDate showId>
          {sortedTasks.map((t) => {
            const isDone = t.status === "erledigt";
            return (
              <li key={t.id} className="relative flex min-h-11 items-center gap-2.5 border-t border-line px-3 text-[13px] first:border-t-0 hover:bg-hover md:min-h-[38px]">
                <StatusCheck status={t.status} title={t.title} onToggle={() => onToggleTask(t)} />
                <Link
                  href={`/aufgaben?aufgabe=${t.id}`}
                  className={cn("min-w-0 flex-1 truncate rounded-sm after:absolute after:inset-0", isDone && "text-fg-3 line-through")}
                >
                  {t.title}
                </Link>
                {t.due_date && <span className="shrink-0 text-[11.5px] text-fg-3 tabular">{formatShort(t.due_date)}</span>}
                <Avatar person={personById(t.assignee_id)} size={22} />
              </li>
            );
          })}
          <li className="border-t border-line first:border-t-0">
            <button
              type="button"
              onClick={onNewTask}
              className="flex min-h-11 w-full items-center gap-2.5 px-3 text-left text-[13px] text-fg-2 transition-colors duration-150 hover:bg-hover hover:text-fg md:min-h-[38px]"
            >
              <Plus className="size-3.5" aria-hidden />
              Aufgabe
            </button>
          </li>
        </MilestoneChecklist>
      </div>
    </Tag>
  );
}

/** Datum, das wie Text aussieht; gespeichert wird beim Verlassen bzw. mit Enter (Tippen in den Teilfeldern löst
 *  sonst bei jeder Ziffer eine Änderung aus) und, falls das Feld dabei verschwindet (Handy-Sheet zu), beim Abbauen. */
function DateField({ id, value, min, onCommit }: { id: string; value: string; min?: string; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const pending = useRef<{ draft: string | null; value: string; onCommit: (v: string) => void }>({ draft: null, value, onCommit });
  useEffect(() => {
    pending.current = { draft, value, onCommit };
  });
  useEffect(
    () => () => {
      const p = pending.current;
      if (p.draft && p.draft !== p.value) p.onCommit(p.draft);
    },
    []
  );
  const commit = () => {
    if (draft && draft !== value) onCommit(draft);
    pending.current.draft = null; // nicht beim Abbauen ein zweites Mal speichern
    setDraft(null);
  };
  return (
    <span className="inline-flex items-center gap-1 rounded-lg pl-1.5 hover:bg-hover">
      <CalendarDays className="size-3.5 shrink-0 text-fg-3" aria-hidden />
      <label htmlFor={id} className="sr-only">
        Fällig am
      </label>
      <input
        id={id}
        type="date"
        value={draft ?? value}
        min={min && min > DATE_MIN ? min : DATE_MIN}
        max={DATE_MAX}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        // Eigenes Kalender-Symbol links, das des Browsers ist versteckt: Klick aufs Datum öffnet den Kalender trotzdem
        onClick={(e) => {
          try {
            e.currentTarget.showPicker();
          } catch {
            // ältere Browser: Tippen ins Feld geht weiterhin
          }
        }}
        className="field-sizing-content h-8 cursor-pointer rounded-lg bg-transparent pr-1.5 text-[13px] text-fg tabular max-md:h-11 max-md:text-base [&::-webkit-calendar-picker-indicator]:hidden"
      />
    </span>
  );
}
