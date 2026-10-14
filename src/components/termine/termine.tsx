"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight, Plus, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/avatar";
import { useToast } from "@/components/toast";
import { MobileSheet } from "@/components/mobile-sheet";
import { Segmented } from "@/components/segmented";
import { PageHeader } from "@/components/app-shell/page-header";
import { useTeam } from "@/components/app-shell/team-provider";
import { NewTaskDialog } from "@/components/tasks/new-task-dialog";
import { useTaskActions } from "@/components/tasks/use-task-actions";
import { NewDecisionDialog } from "@/components/wissen/dialogs";
import { useTopics } from "@/components/dokumente/use-topics";
import { useToday } from "@/lib/use-today";
import { useIsMobile } from "@/lib/use-is-mobile";
import { formatShort, relativeDays } from "@/lib/dates";
import { FOLLOW_UP_ROUNDS } from "@/lib/phases";
import { useMeetings } from "@/lib/data/use-meetings";
import { useMilestones } from "@/lib/data/use-milestones";
import { useOrganizations } from "@/lib/data/use-organizations";
import { useTasks } from "@/lib/data/use-tasks";
import { useKnowledge } from "@/lib/data/use-knowledge";
import { logActivity } from "@/lib/data/use-feed";
import { plusDays, timeRange, viennaParts, weekLabel, weekStart, type Meeting, joinUrl, fromVienna } from "@/lib/meetings";
import { MeetingDetail } from "./meeting-detail";
import { NewMeetingDialog, type MeetingDefaults } from "./new-meeting-dialog";
import { useMeetingActions } from "./use-meeting-actions";
import { WeekView, type AllDay } from "./week-view";
import { MeetingMenu } from "./meeting-menu";

// Termine (Plan Welle 1, Schritt 3): Team-Meetings und Partner-Calls an einem Ort, mit Agenda, Notizen, Unterlagen
// und Ergebnissen. Desktop: Woche (Standard) oder Liste; Handy: Liste. Detail rechts, zweiter Klick schließt.
// Adresse: ?termin=<id> (teilbar), ?woche=<Montag>, ?ansicht=liste, ?neu=1 (Taste T).

export function Termine() {
  const today = useToday();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const toast = useToast();
  const isMobile = useIsMobile();
  const { me } = useTeam();
  const api = useMeetings();
  const { milestones } = useMilestones();
  const { orgs } = useOrganizations();
  const tasksApi = useTasks();
  const k = useKnowledge();
  const taskActions = useTaskActions(tasksApi);
  const topics = useTopics(milestones, orgs, tasksApi.tasks, api.meetings);
  const [mine, setMine] = useState(false);
  const [draft, setDraft] = useState<MeetingDefaults | null>(null);
  const [newTask, setNewTask] = useState(false);
  const [newDecision, setNewDecision] = useState(false);

  const selId = params.get("termin");
  const list = params.get("ansicht") === "liste" || isMobile;

  const setParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, v] of Object.entries(patch)) {
      if (v === null) next.delete(key);
      else next.set(key, v);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const open = (m: Meeting) => setParams({ termin: m.id === selId ? null : m.id });
  /** Löschen (Rechtsklick oder Symbol im Detail), mit Rückgängig */
  const remove = (m: Meeting) => {
    if (m.id === selId) close();
    actions.remove(m);
  };
  const close = () => setParams({ termin: null });

  const actions = useMeetingActions(api, tasksApi, {
    onOpen: (m) => setParams({ termin: m.id, neu: null, woche: weekStart(viennaParts(m.starts_at).date) }),
  });

  if (api.meetings === null || !today || !milestones) {
    return (
      <>
        <PageHeader title="Termine" />
        <div className="m-3.5 h-[420px] rounded-xl bg-card-2 md:m-5" aria-busy="true" aria-label="Termine lädt" />
      </>
    );
  }
  const all = api.meetings || [];
  const meeting = all.find((m) => m.id === selId) ?? null;
  // Direktlink auf einen Termin öffnet dessen Woche.
  const monday = params.get("woche") ?? weekStart(meeting ? viennaParts(meeting.starts_at).date : today);
  const shown = mine && me ? all.filter((m) => m.attendees.includes(me.id) || m.created_by === me.id) : all;

  const allDay: AllDay[] = [
    ...milestones
      .filter((m) => m.status !== "erledigt")
      .map((m) => ({ key: `m-${m.id}`, date: m.due_date, label: `${m.id} ${m.title}`, href: `/roadmap?m=${m.id}`, kind: "milestone" as const })),
    ...FOLLOW_UP_ROUNDS.map((d) => ({ key: `r-${d}`, date: d, label: "Nachfass-Runde", href: "/pipeline", kind: "round" as const })),
  ];

  const startDraft = (d?: Partial<MeetingDefaults>) => {
    const base = viennaParts(new Date());
    // Nächste volle Stunde als Vorschlag
    const hour = Math.min(23, Math.floor(base.minutes / 60) + 1);
    setDraft({ date: today, time: `${String(hour).padStart(2, "0")}:00`, ...d });
  };
  const dialogOpen = !!draft || params.get("neu") === "1";

  const detail = meeting ? (
    <MeetingDetail
      key={meeting.id}
      meeting={meeting}
      orgs={orgs ?? []}
      tasks={(tasksApi.tasks ?? []).filter((t) => t.meeting_id === meeting.id)}
      decisions={(k.decisions ?? []).filter((d) => d.target_type === "meeting" && d.target_id === meeting.id)}
      onUpdate={(p) => actions.update(meeting, p)}
      onSaveText={(field, md) =>
        api.update(
          meeting.id,
          field === "agenda"
            ? { agenda: md, agenda_updated_at: new Date().toISOString(), agenda_updated_by: me?.id ?? null }
            : { notes: md, notes_updated_at: new Date().toISOString(), notes_updated_by: me?.id ?? null }
        )
      }
      onCreateTask={(title) => taskActions.createTask({ title, area_id: meeting.area_id, meeting_id: meeting.id }, (id) => `/aufgaben?aufgabe=${id}`)}
      onToggleTask={taskActions.toggleDone}
      onNewTask={() => setNewTask(true)}
      onNewDecision={() => setNewDecision(true)}
      onNext={() => actions.createNext(meeting)}
      onCalendar={() => actions.openCalendar(meeting)}
      onDelete={() => remove(meeting)}
      onClose={close}
    />
  ) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title="Termine" action={{ label: "Termin", onClick: () => startDraft() }} />
      <div className="relative flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col md:overflow-hidden">
          <h1 className="px-3.5 pt-2 pb-2 text-[21px] font-semibold tracking-[-0.025em] md:sr-only">Termine</h1>

          {/* Werkzeugleiste */}
          <div className="flex flex-wrap items-center gap-2 px-3.5 pb-3 md:border-b md:border-line md:px-[18px] md:py-3">
            {!list && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setParams({ woche: null, termin: null })}
                  className="inline-flex h-8 items-center rounded-[9px] px-3 text-[13px] font-medium text-fg-2 shadow-[inset_0_0_0_1px_var(--line2)] hover:bg-hover hover:text-fg"
                >
                  Heute
                </button>
                <button
                  type="button"
                  onClick={() => setParams({ woche: plusDays(monday, -7) })}
                  className="grid size-8 place-items-center rounded-lg text-fg-2 hover:bg-hover hover:text-fg"
                  aria-label="Vorige Woche"
                >
                  <ChevronLeft className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setParams({ woche: plusDays(monday, 7) })}
                  className="grid size-8 place-items-center rounded-lg text-fg-2 hover:bg-hover hover:text-fg"
                  aria-label="Nächste Woche"
                >
                  <ChevronRight className="size-4" aria-hidden />
                </button>
                <h2 className="ml-1 text-[14px] font-semibold tabular" aria-live="polite">
                  {weekLabel(monday)}
                </h2>
              </div>
            )}
            <div className="flex items-center gap-2 max-md:w-full md:ml-auto">
              <button
                type="button"
                aria-pressed={mine}
                onClick={() => setMine((v) => !v)}
                className={cn(
                  "inline-flex h-8 items-center rounded-full px-3 text-[13px] transition-colors duration-150 max-md:h-10",
                  mine ? "bg-active font-medium text-fg shadow-[inset_0_0_0_1px_var(--line2)]" : "text-fg-2 hover:bg-hover hover:text-fg"
                )}
              >
                Nur meine
              </button>
              {!isMobile && (
                <Segmented
                  label="Ansicht"
                  value={list ? "liste" : "woche"}
                  options={[
                    { value: "woche", label: "Woche" },
                    { value: "liste", label: "Liste" },
                  ]}
                  onChange={(v) => setParams({ ansicht: v === "liste" ? "liste" : null })}
                />
              )}
              <button
                type="button"
                onClick={() => startDraft()}
                className="ml-auto inline-flex h-10 items-center rounded-[9px] bg-acc px-3.5 text-[14px] font-medium text-acc-text md:hidden"
              >
                + Termin
              </button>
            </div>
          </div>

          {api.meetings === false && <p className="px-5 py-8 text-center text-[13.5px] text-st-red">Termine konnten nicht geladen werden.</p>}
          {list ? (
            <div className="min-h-0 flex-1 md:overflow-y-auto">
              <MeetingList meetings={shown} today={today} selected={selId} onOpen={open} onDelete={remove} onNew={() => startDraft()} />
            </div>
          ) : (
            <WeekView
              monday={monday}
              today={today}
              meetings={shown}
              allDay={allDay}
              selected={selId}
              onOpen={open}
              onCreate={(d) => startDraft(d)}
              onDelete={remove}
              onMove={(m, date, minutes, duration) =>
                actions.update(m, {
                  starts_at: fromVienna(date, `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`),
                  duration_min: duration,
                })
              }
            />
          )}
        </div>

        {detail && !isMobile && (
          <aside data-detail aria-label="Termin im Detail" className="w-[460px] shrink-0 overflow-y-auto border-l border-line bg-card">
            {detail}
          </aside>
        )}
      </div>

      <MobileSheet open={!!detail && isMobile} onClose={close} title={meeting?.title ?? ""}>
        {detail}
      </MobileSheet>

      <NewMeetingDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          if (!o) {
            setDraft(null);
            if (params.get("neu")) setParams({ neu: null });
          }
        }}
        defaults={draft ?? { date: today, time: `${String(Math.min(23, Math.floor(viennaParts(new Date()).minutes / 60) + 1)).padStart(2, "0")}:00` }}
        onCreate={actions.create}
      />

      {meeting && (
        <>
          <NewTaskDialog
            open={newTask}
            onOpenChange={setNewTask}
            milestones={milestones}
            defaults={{ area_id: meeting.area_id }}
            onCreate={async (input) => !!(await taskActions.createTask({ ...input, meeting_id: meeting.id }, (id) => `/aufgaben?aufgabe=${id}`))}
          />
          <NewDecisionDialog
            open={newDecision}
            onOpenChange={setNewDecision}
            today={today}
            topics={topics}
            defaults={{ area_id: meeting.area_id, topic: `meeting:${meeting.id}` }}
            onCreate={async (input) => {
              const d = await k.createDecision(input);
              if (!d) return false;
              logActivity("decision", d.id, me?.id ?? null, "created");
              toast({ text: `„${d.title}“ festgehalten` });
              return true;
            }}
          />
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------
// Liste nach Tag (Handy immer, Desktop umschaltbar): kommende Termine, Vergangene eingeklappt
// ---------------------------------------------------------------
function MeetingList({
  meetings,
  today,
  selected,
  onOpen,
  onDelete,
  onNew,
}: {
  meetings: Meeting[];
  today: string;
  selected: string | null;
  onOpen: (m: Meeting) => void;
  onDelete: (m: Meeting) => void;
  onNew: () => void;
}) {
  const [past, setPast] = useState(false);
  const upcoming = meetings.filter((m) => viennaParts(m.starts_at).date >= today);
  const before = meetings.filter((m) => viennaParts(m.starts_at).date < today).reverse();

  if (meetings.length === 0) {
    return (
      <button
        type="button"
        onClick={onNew}
        className="m-3.5 flex w-[calc(100%-28px)] flex-col items-center gap-2 rounded-[14px] border border-dashed border-line-2 bg-card-2 px-4 py-14 text-center text-[14px] text-fg-2 hover:text-fg md:m-5 md:w-[calc(100%-40px)]"
      >
        <Plus className="size-5 text-fg-3" aria-hidden />
        Noch keine Termine.
      </button>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-4 px-3.5 pb-8 md:px-6 md:pt-5">
      {upcoming.length === 0 && <p className="rounded-[14px] bg-card-2 px-4 py-8 text-center text-[13.5px] text-fg-2">Keine kommenden Termine.</p>}
      <DayGroups meetings={upcoming} today={today} selected={selected} onOpen={onOpen} onDelete={onDelete} />
      {before.length > 0 && (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            aria-expanded={past}
            onClick={() => setPast((v) => !v)}
            className="inline-flex min-h-10 items-center gap-2 self-start rounded-lg px-1 text-[13px] font-medium text-fg-2 hover:text-fg"
          >
            Vergangene <span className="font-normal text-fg-3 tabular">{before.length}</span>
            <ChevronDown className={cn("size-3.5 text-fg-3 transition-transform duration-200", past && "rotate-180")} aria-hidden />
          </button>
          {past && <DayGroups meetings={before} today={today} selected={selected} onOpen={onOpen} onDelete={onDelete} />}
        </div>
      )}
    </div>
  );
}

function DayGroups({
  meetings,
  today,
  selected,
  onOpen,
  onDelete,
}: {
  meetings: Meeting[];
  today: string;
  selected: string | null;
  onOpen: (m: Meeting) => void;
  onDelete: (m: Meeting) => void;
}) {
  const { areaById, personById, me } = useTeam();
  const { orgs } = useOrganizations();
  const days = [...new Set(meetings.map((m) => viennaParts(m.starts_at).date))];
  return (
    <>
      {days.map((d) => (
        <section key={d} className="flex flex-col gap-2">
          <h2 className={cn("label-mono px-1", d === today && "text-acc-line!")}>
            {formatShort(d)} · {relativeDays(d, today)}
          </h2>
          <ul className="overflow-hidden rounded-xl bg-card shadow-card">
            {meetings
              .filter((m) => viennaParts(m.starts_at).date === d)
              .map((m) => {
                const area = areaById(m.area_id);
                const org = orgs?.find((o) => o.id === m.organization_id);
                const sub = [m.location, org?.name].filter(Boolean).join(" · ");
                const others = m.attendees.map((id) => personById(id)).filter((p) => !!p);
                return (
                  <MeetingMenu key={m.id} meeting={m} onOpen={() => onOpen(m)} onDelete={() => onDelete(m)}>
                    <li
                      className={cn(
                        "relative flex min-h-14 items-center gap-3 border-t border-line px-3.5 py-2.5 first:border-t-0",
                        m.id === selected ? "bg-active" : "hover:bg-hover"
                      )}
                    >
                      <span className="w-[86px] shrink-0 text-[12.5px] text-fg-2 tabular max-md:w-[78px]">{timeRange(m)}</span>
                      <span
                        className="h-8 w-[3px] shrink-0 rounded-full bg-line-2"
                        style={area ? { background: area.color } : undefined}
                        aria-hidden
                      />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => onOpen(m)}
                          aria-current={m.id === selected ? "true" : undefined}
                          className="flex min-w-0 items-center gap-1.5 rounded-sm text-left text-[14px] font-medium after:absolute after:inset-0 max-md:text-[15px]"
                        >
                          <span className="truncate">{m.title}</span>
                          {me && m.attendees.includes(me.id) && <span className="sr-only">, du bist dabei</span>}
                        </button>
                        {(sub || area) && <span className="truncate text-[12.5px] text-fg-3">{[area?.name, sub].filter(Boolean).join(" · ")}</span>}
                      </span>
                      {joinUrl(m) && (
                        <a
                          href={joinUrl(m)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative z-[1] grid size-8 shrink-0 place-items-center rounded-lg text-fg-3 hover:bg-active hover:text-fg max-md:size-10"
                          aria-label={`„${m.title}“ beitreten`}
                          title="Beitreten"
                        >
                          <Video className="size-4" aria-hidden />
                        </a>
                      )}
                      <span className="flex shrink-0 -space-x-1.5 max-sm:hidden">
                        {others.slice(0, 4).map((p) => (
                          <span key={p.id} className="rounded-full shadow-[0_0_0_2px_var(--card)]">
                            <Avatar person={p} size={22} />
                          </span>
                        ))}
                        {others.length > 4 && (
                          <span className="grid size-[22px] place-items-center rounded-full bg-active text-[10px] text-fg-2">
                            +{others.length - 4}
                          </span>
                        )}
                      </span>
                    </li>
                  </MeetingMenu>
                );
              })}
          </ul>
        </section>
      ))}
    </>
  );
}
