"use client";

import Link from "next/link";
import { ArrowUpRight, CalendarPlus, Gavel, Plus, Repeat, Trash2, Video, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CopyLinkButton } from "@/components/copy-link-button";
import { Feed } from "@/components/feed";
import { EditText, PropRow, SelectBox } from "@/components/detail-fields";
import { DateInput } from "@/components/ui/date-input";
import { durationOptions, nameOptions } from "@/lib/options";
import { NoteEditor } from "@/components/editor/note-editor";
import { useNotesDraft } from "@/components/editor/notes-card";
import { DocBlock } from "@/components/dokumente/doc-block";
import { StatusCheck } from "@/components/tasks/status-check";
import { PeoplePicker } from "@/components/wissen/pickers";
import { PrivateToggle } from "./private-toggle";
import { useTeam } from "@/components/app-shell/team-provider";
import { formatLong } from "@/lib/dates";
import type { Decision } from "@/lib/data/use-knowledge";
import type { Organization } from "@/lib/pipeline";
import type { Task } from "@/lib/tasks";
import {
  fromVienna,
  meetingHref,
  timeRange,
  viennaParts,
  type Meeting,
  type MeetingPatch,
  joinUrl,
  meetUrlFrom,
} from "@/lib/meetings";

// Termin-Detail (rechts 460px, am Handy als Bottom Sheet): Wann · Wo · Wer · Firma · Bereich, Agenda und Notizen im
// gemeinsamen Editor, Unterlagen (Dokumente am Termin), Ergebnisse (Aufgaben und Entscheidungen aus dem Termin), Verlauf.

const actionBtn =
  "inline-flex h-8 items-center gap-1.5 rounded-[9px] px-2.5 text-[12.5px] font-medium text-fg-2 shadow-[inset_0_0_0_1px_var(--line2)] transition-colors duration-150 hover:bg-hover hover:text-fg max-md:h-11 max-md:text-[14px]";

export function MeetingDetail({
  meeting: m,
  orgs,
  tasks,
  decisions,
  onUpdate,
  onSaveText,
  onCreateTask,
  onToggleTask,
  onNewTask,
  onNewDecision,
  onNext,
  onCalendar,
  onDelete,
  onClose,
}: {
  meeting: Meeting;
  orgs: Organization[];
  /** Aufgaben aus diesem Termin */
  tasks: Task[];
  /** Entscheidungen aus diesem Termin */
  decisions: Decision[];
  onUpdate: (patch: MeetingPatch) => void;
  onSaveText: (field: "agenda" | "notes", markdown: string) => Promise<boolean>;
  onCreateTask: (title: string) => Promise<string | null>;
  onToggleTask: (t: Task) => void;
  onNewTask: () => void;
  onNewDecision: () => void;
  onNext: () => void;
  onCalendar: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const { allAreas, areaById, me } = useTeam();
  const f = (name: string) => `meeting-${m.id}-${name}`;
  const start = viennaParts(m.starts_at);
  const area = areaById(m.area_id);
  const sortedOrgs = [...orgs].sort((a, b) => a.name.localeCompare(b.name, "de"));
  const setStart = (date: string, time: string) => date && time && onUpdate({ starts_at: fromVienna(date, time) });

  return (
    <div className="flex flex-col">
      {/* Kopf */}
      <div className="flex flex-col gap-3 border-b border-line px-[18px] pt-4 pb-3.5">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="px-2 text-[12.5px] text-fg-3 tabular">
              {formatLong(start.date)} · {timeRange(m)}
            </p>
            <h2>
              <span className="sr-only">Titel</span>
              <EditText
                id={f("title")}
                value={m.title}
                placeholder="Titel"
                required
                wrap
                onSave={(v) => v && onUpdate({ title: v })}
                className="text-[17px] font-semibold tracking-[-0.01em] md:text-[17px]"
              />
            </h2>
          </div>
          <CopyLinkButton path={meetingHref(m.id)} label="Link zu diesem Termin kopieren" />
          <button
            type="button"
            onClick={onDelete}
            title="Termin löschen"
            className="grid size-8 shrink-0 place-items-center rounded-lg text-fg-3 transition-colors duration-150 hover:bg-hover hover:text-st-red max-md:size-11"
            aria-label="Termin löschen"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 shrink-0 place-items-center rounded-lg text-fg-3 hover:bg-hover hover:text-fg max-md:size-11"
            aria-label="Detail schließen"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {joinUrl(m) && (
            <a
              href={joinUrl(m)!}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-[9px] bg-acc px-3 text-[12.5px] font-medium text-acc-text transition-[scale] duration-150 active:scale-[.97] max-md:h-11 max-md:text-[14px]"
            >
              <Video className="size-3.5" aria-hidden />
              Beitreten
            </a>
          )}
          {!m.private_for && (
            <button type="button" onClick={onCalendar} className={actionBtn}>
              <CalendarPlus className="size-3.5" aria-hidden />
              In Google Kalender
            </button>
          )}
          <button type="button" onClick={onNext} className={actionBtn}>
            <Repeat className="size-3.5" aria-hidden />
            Nächster Termin
          </button>
        </div>
      </div>

      {/* Eigenschaften */}
      <div className="flex flex-col border-b border-line px-[18px] py-2.5">
        <PropRow label="Wann" htmlFor={f("date")}>
          <span className="flex flex-wrap items-center gap-1">
            <DateInput
              id={f("date")}
              value={start.date}
              onChange={(e) => setStart(e.target.value, start.time)}
              className="h-8 rounded-lg px-2 text-[13px] text-fg hover:bg-hover max-md:text-base"
            />
            <label className="sr-only" htmlFor={f("time")}>
              Beginn
            </label>
            <input
              id={f("time")}
              type="time"
              step={300}
              value={start.time}
              onChange={(e) => setStart(start.date, e.target.value)}
              className="h-8 rounded-lg bg-transparent px-2 text-[13px] text-fg tabular hover:bg-hover max-md:text-base"
            />
            <label className="sr-only" htmlFor={f("dur")}>
              Dauer
            </label>
            <span className="w-[92px]">
              <SelectBox
                id={f("dur")}
                value={String(m.duration_min)}
                onChange={(v) => onUpdate({ duration_min: Number(v) })}
                options={durationOptions(m.duration_min)}
              />
            </span>
          </span>
        </PropRow>
        <PropRow label="Ort" htmlFor={f("loc")}>
          <EditText id={f("loc")} value={m.location} placeholder="–" onSave={(v) => onUpdate({ location: v })} />
        </PropRow>
        <PropRow label="Meet-Link" htmlFor={f("meet")}>
          {/* Der Meet-Link kommt aus Google (Google hängt beim Eintragen selbst einen an), sonst gibt es zwei Calls. */}
          <EditText
            id={f("meet")}
            value={joinUrl(m) ?? m.meet_url}
            placeholder="aus Google einfügen"
            onSave={(v) => {
              // Ganzen Google-Block eingefügt? Nur den Link nehmen; ohne Link nichts ändern.
              const url = v ? meetUrlFrom(v) : null;
              if (v && !url) return;
              onUpdate({ meet_url: url });
            }}
          />
        </PropRow>
        {!m.private_for && (
          <>
            <PropRow label="Wer">
              <div className="py-1">
                <PeoplePicker label="Wer ist dabei" size="sm" value={m.attendees} onChange={(ids) => onUpdate({ attendees: ids })} />
              </div>
            </PropRow>
            <PropRow label="Firma" htmlFor={f("org")}>
              <span className="flex items-center gap-1">
                <span className="min-w-0 flex-1">
                  <SelectBox
                    id={f("org")}
                    value={m.organization_id ?? ""}
                    onChange={(v) => onUpdate({ organization_id: v || null })}
                    options={nameOptions(sortedOrgs, "Keine")}
                    searchable
                  />
                </span>
                {m.organization_id && (
                  <Link
                    href={`/pipeline?firma=${m.organization_id}`}
                    className="grid size-8 shrink-0 place-items-center rounded-lg text-fg-3 hover:bg-hover hover:text-fg"
                    aria-label="Firma in der Pipeline öffnen"
                  >
                    <ArrowUpRight className="size-3.5" aria-hidden />
                  </Link>
                )}
              </span>
            </PropRow>
          </>
        )}
        <PropRow label="Bereich" htmlFor={f("area")}>
          <span className="flex items-center gap-1">
            <span className="ml-1.5 size-[7px] shrink-0 rounded-full bg-line-2" style={area ? { background: area.color } : undefined} aria-hidden />
            <span className="flex-1">
              <SelectBox id={f("area")} value={m.area_id ?? ""} onChange={(v) => onUpdate({ area_id: v || null })} options={nameOptions(allAreas, "Kein Bereich")} />
            </span>
          </span>
        </PropRow>
        {/* Privat stellen darf nur, wer den Termin angelegt hat (sonst verschwände er für alle anderen; die Datenbank prüft das auch).
            Privat = nur ich, ohne Firma (sonst stünde er im Verlauf der Firma). Zurück auf Team behält mich als dabei. */}
        {me && (m.private_for || m.created_by === me.id) && (
          <PropRow label="Sichtbar">
            <PrivateToggle
              on={!!m.private_for}
              onChange={(on) => onUpdate(on ? { private_for: me.id, attendees: [me.id], organization_id: null } : { private_for: null })}
            />
          </PropRow>
        )}
      </div>

      <TextSection
        key={`agenda-${m.id}`}
        id={m.id}
        title="Agenda"
        field="agenda"
        data={{ notes: m.agenda, updatedAt: m.agenda_updated_at, updatedBy: m.agenda_updated_by }}
        placeholder="Punkte für das Meeting …"
        onSave={onSaveText}
        onCreateTask={onCreateTask}
      />
      <TextSection
        key={`notes-${m.id}`}
        id={m.id}
        title="Notizen"
        field="notes"
        data={{ notes: m.notes, updatedAt: m.notes_updated_at, updatedBy: m.notes_updated_by }}
        placeholder="Mitschrift … Zeile markieren → Aufgabe"
        onSave={onSaveText}
        onCreateTask={onCreateTask}
      />

      {/* Privat: keine Unterlagen, Ergebnisse und Kommentare. Die lägen in Tabellen, die das ganze Team sieht. */}
      {!m.private_for && (
        <>
          <div className="border-b border-line px-[18px] py-3.5">
            <DocBlock
              variant="plain"
              title="Unterlagen"
              defaults={{ area_id: m.area_id, target_type: "meeting", target_id: m.id }}
              match={(d) => d.target_type === "meeting" && d.target_id === m.id}
            />
          </div>

          {/* Ergebnisse */}
          <section aria-label="Ergebnisse" className="border-b border-line px-[18px] py-3.5">
            <div className="flex items-center justify-between gap-2 pb-2">
              <h3 className="flex items-center gap-2 text-[13px] font-semibold">
                Ergebnisse
                {tasks.length + decisions.length > 0 && <span className="font-normal text-fg-3 tabular">{tasks.length + decisions.length}</span>}
              </h3>
              <span className="flex gap-1.5">
                <button type="button" onClick={onNewTask} className={cn(actionBtn, "h-8 max-md:h-10")}>
                  <Plus className="size-3.5" aria-hidden />
                  Aufgabe
                </button>
                <button type="button" onClick={onNewDecision} className={cn(actionBtn, "h-8 max-md:h-10")}>
                  <Plus className="size-3.5" aria-hidden />
                  Entscheidung
                </button>
              </span>
            </div>
            {tasks.length + decisions.length > 0 && (
              <ul className="overflow-hidden rounded-[10px] shadow-[0_0_0_1px_var(--line)]">
                {decisions.map((d) => (
                  <li
                    key={d.id}
                    className="relative flex min-h-11 items-center gap-2.5 border-t border-line px-3.5 first:border-t-0 hover:bg-hover max-md:min-h-12"
                  >
                    <Gavel className="size-3.5 shrink-0 text-fg-3" aria-label="Entscheidung" />
                    <Link
                      href={`/dokumente?entscheidung=${d.id}`}
                      className="min-w-0 flex-1 truncate rounded-sm text-[13.5px] after:absolute after:inset-0 max-md:text-[15px]"
                    >
                      {d.title}
                    </Link>
                  </li>
                ))}
                {tasks.map((t) => (
                  <li
                    key={t.id}
                    className="relative flex min-h-11 items-center gap-2.5 border-t border-line px-3.5 first:border-t-0 hover:bg-hover max-md:min-h-12"
                  >
                    <StatusCheck status={t.status} title={t.title} onToggle={() => onToggleTask(t)} />
                    <Link
                      href={`/aufgaben?aufgabe=${t.id}`}
                      className={cn(
                        "min-w-0 flex-1 truncate rounded-sm text-[13.5px] after:absolute after:inset-0 max-md:text-[15px]",
                        t.status === "erledigt" && "text-fg-3 line-through"
                      )}
                    >
                      {t.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="px-[18px] pt-3.5 pb-6">
            <Feed
              targetType="meeting"
              targetId={m.id}
              describe={(a) =>
                a.action === "created" ? "hat den Termin angelegt" : a.action === "next_created" ? "hat den nächsten Termin angelegt" : a.action
              }
            />
          </div>
        </>
      )}
    </div>
  );
}

/** Agenda bzw. Notizen: Editor mit Autospeichern, „wer · wann“ und „… schreibt gerade“. */
function TextSection({
  id,
  title,
  field,
  data,
  placeholder,
  onSave,
  onCreateTask,
}: {
  id: string;
  title: string;
  field: "agenda" | "notes";
  data: { notes: string; updatedAt: string | null; updatedBy: string | null };
  placeholder: string;
  onSave: (field: "agenda" | "notes", markdown: string) => Promise<boolean>;
  onCreateTask: (title: string) => Promise<string | null>;
}) {
  const draft = useNotesDraft({ data, save: (md) => onSave(field, md), presenceKey: `meeting-${field}-${id}` });
  return (
    <section className="border-b border-line has-[.ProseMirror-focused]:bg-panel">
      <div className="flex items-center justify-between gap-3 px-[18px] pt-3">
        <h3 className="text-[13px] font-semibold">{title}</h3>
        <span className={cn("truncate text-[12px] text-fg-3 tabular", draft.error && "text-st-red")} aria-live="polite">
          {draft.meta}
        </span>
      </div>
      <NoteEditor
        value={draft.value}
        label={title}
        placeholder={placeholder}
        onChange={draft.onChange}
        onBlur={draft.onBlur}
        onCreateTask={onCreateTask}
        className="flex min-h-[110px] flex-col [&_.ProseMirror]:px-[18px] [&_.ProseMirror]:pt-2"
      />
    </section>
  );
}
