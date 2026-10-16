"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/select";
import { nameOptions } from "@/lib/options";
import { Avatar } from "@/components/avatar";
import { AreaGlyph } from "@/components/area-glyph";
import { Chip, DueChip } from "@/components/chip";
import { useToast } from "@/components/toast";
import { NotesCard } from "@/components/editor/notes-card";
import { DocBlock } from "@/components/dokumente/doc-block";
import { MeetingBlock } from "@/components/termine/meeting-block";
import { useTaskActions } from "@/components/tasks/use-task-actions";
import { PageHeader } from "@/components/app-shell/page-header";
import { useTeam } from "@/components/app-shell/team-provider";
import { StatusCheck } from "@/components/tasks/status-check";
import { OrgName } from "@/components/tasks/org-name";
import { useToday } from "@/lib/use-today";
import { daysBetween, formatShort } from "@/lib/dates";
import { useMilestones, type Milestone } from "@/lib/data/use-milestones";
import { useTasks } from "@/lib/data/use-tasks";
import { useOrganizations } from "@/lib/data/use-organizations";
import { useAreaNotes } from "@/lib/data/use-area-notes";
import { followState, formatEuro, inTab, parseEuro, sponsoring, STAGES, TABS, type Organization, type TabId } from "@/lib/pipeline";
import { EditText } from "@/components/detail-fields";
import { sortTasks, type Task } from "@/lib/tasks";

// Bereichs-Seite (Umfang v1): verantwortliche Person, Fortschritt, Notizen, Meilensteine und Aufgaben eines Teilprojekts.
// Bereiche mit Pipeline (Partner, Sponsoren, Jury, Venue) zeigen dazu ihr Ziel aus der Pipeline.

const card = "rounded-[14px] bg-card shadow-card";

const PIPELINE_TAB: Record<string, TabId> = {
  partner: "partner",
  sponsoren: "sponsoren",
  jury: "jury",
  venue: "venues",
};

export function AreaPage({ id }: { id: string }) {
  const today = useToday();
  const router = useRouter();
  const { areaById } = useTeam();
  const { milestones, setMilestoneDone } = useMilestones();
  const tasksApi = useTasks();
  const { tasks } = tasksApi;
  const { toggleDone, createTask } = useTaskActions(tasksApi);
  const { orgs } = useOrganizations();

  const area = areaById(id);
  const tab = PIPELINE_TAB[id] ?? null;
  const newTask = () => router.push(`/aufgaben?bereich=${id}&neu=1`);

  if (!today || !area || !milestones || !tasks || (tab && !orgs)) {
    return <AreaSkeleton />;
  }

  const own = milestones.filter((m) => m.area_id === id);
  const areaTasks = tasks.filter((t) => t.area_id === id);

  return (
    <>
      <PageHeader title={area.name} action={{ label: "Aufgabe", onClick: newTask }} />
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-3.5 pt-2 pb-8 md:gap-5 md:px-8 md:pt-8 md:pb-12">
        <h1 className="flex items-center gap-2.5 pb-1.5 text-[21px] font-semibold tracking-[-0.025em] md:sr-only">
          <span className="group">
            <AreaGlyph color={area.color} progress={own.length ? own.filter((m) => m.status === "erledigt").length / own.length : 0} size={22} />
          </span>
          {area.name}
        </h1>

        {/* Kopf-Leiste wie die Eigenschaften eines Projekts in Linear: Verantwortlich · Pipeline-Ziel · Meilensteine · Aufgaben */}
        <SummaryStrip areaId={id} own={own} tasks={areaTasks} tab={tab} orgs={orgs ?? []} today={today} />

        {/* Links die Notizen als Ablage, rechts was zu tun ist. Am Handy erst Meilensteine/Aufgaben, Notizen unten. */}
        <div className="grid gap-4 md:gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <AreaNotes
            areaId={id}
            areaName={area.name}
            onCreateTask={(title) => createTask({ title, area_id: id }, (taskId) => `/aufgaben?bereich=${id}&aufgabe=${taskId}`)}
          />
          <div className="flex min-w-0 flex-col items-stretch gap-4 self-start max-lg:order-first md:gap-5">
            <MilestonesCard milestones={milestones} own={own} today={today} onToggle={setMilestoneDone} />
            <TasksCard areaId={id} tasks={areaTasks} milestones={milestones} orgs={orgs ?? []} today={today} onToggle={toggleDone} onNew={newTask} />
            <MeetingBlock area_id={id} match={(m) => m.area_id === id} />
            <DocBlock defaults={{ area_id: id }} match={(d) => d.area_id === id} />
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------
// Kopf-Leiste: eine Karte, Felder durch feine Linien getrennt (gap-px auf Linienfarbe)
// ---------------------------------------------------------------
function Bar({ value, total }: { value: number; total: number }) {
  return (
    <div className="h-[3px] overflow-hidden rounded-sm bg-line-2">
      <div
        className="h-full rounded-sm bg-acc-line transition-[width] duration-300 ease-out"
        style={{ width: `${total ? (value / total) * 100 : 0}%` }}
      />
    </div>
  );
}

const field = "flex min-w-0 flex-col gap-2.5 bg-card px-5 py-4";

function Count({ value, total, suffix }: { value: number; total: number | null; suffix?: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-[22px] leading-none font-medium tracking-[-0.03em] tabular">{value}</span>
      <span className="text-[13px] text-fg-3 tabular">{total === null ? suffix : `/ ${total}`}</span>
    </span>
  );
}

function SummaryStrip({
  areaId,
  own,
  tasks,
  tab,
  orgs,
  today,
}: {
  areaId: string;
  own: Milestone[];
  tasks: Task[];
  tab: TabId | null;
  orgs: Organization[];
  today: string;
}) {
  const msDone = own.filter((m) => m.status === "erledigt").length;
  const taskDone = tasks.filter((t) => t.status === "erledigt").length;
  const money = areaId === "sponsoren";

  return (
    <section
      aria-label="Überblick"
      className={cn(
        card,
        "grid grid-cols-2 gap-px overflow-hidden bg-line",
        money
          ? // Fünf Felder erst ab breitem Fenster, sonst würde das Ziel-Feld abgeschnitten (Tablet, Prüfer 16.10.)
            "md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)]"
          : tab
            ? "md:grid-cols-[minmax(0,1fr)_minmax(0,1.9fr)_minmax(0,1fr)_minmax(0,1fr)]"
            : "md:grid-cols-3"
      )}
    >
      <OwnerField areaId={areaId} />
      {tab && <PipelineField tab={tab} orgs={orgs} today={today} />}
      {money && <MoneyField orgs={orgs} />}
      <div className={field}>
        <h2 className="label-mono">Meilensteine</h2>
        <Count value={msDone} total={own.length} />
        <Bar value={msDone} total={own.length} />
      </div>
      <div className={cn(field, money && "md:max-xl:col-span-2")}>
        <h2 className="label-mono">Aufgaben</h2>
        {tasks.length ? <Count value={taskDone} total={tasks.length} /> : <Count value={0} total={null} suffix="noch keine" />}
        <Bar value={taskDone} total={tasks.length} />
      </div>
    </section>
  );
}

/** Verantwortliche Person: speichert sofort, live für alle. */
function OwnerField({ areaId }: { areaId: string }) {
  const { areaById, people, personById, setAreaOwner } = useTeam();
  const toast = useToast();
  const area = areaById(areaId)!;
  const owner = personById(area.owner_id);

  const change = async (value: string) => {
    const ok = await setAreaOwner(areaId, value || null);
    if (!ok) toast({ text: "Hat nicht geklappt. Bitte nochmal versuchen." });
  };

  return (
    <div className={cn(field, "max-md:col-span-2")}>
      <h2 className="label-mono">Verantwortlich</h2>
      <Select
        aria-label={`Verantwortliche Person für ${area.name}`}
        value={area.owner_id ?? ""}
        onChange={change}
        options={nameOptions(people, "Noch offen")}
        leading={<Avatar person={owner} size={24} />}
        className={cn(
          "-mx-2 h-9 gap-2.5 rounded-[9px] px-2 text-[15px] font-semibold tracking-[-0.01em] hover:bg-hover max-md:h-11 max-md:text-base",
          !owner && "font-medium text-st-amber"
        )}
      />
    </div>
  );
}

/** Sponsoring in € (Maxi, 16.10.): zugesagtes Partner-Geld gegen das Ziel, das das Team hier einträgt (live für alle). */
function MoneyField({ orgs }: { orgs: Organization[] }) {
  const { areaById, setAreaGoal } = useTeam();
  const toast = useToast();
  const goal = areaById("sponsoren")?.goal_amount ?? null;
  const { secured, prospect } = sponsoring(orgs);

  const save = async (v: string | null) => {
    const n = parseEuro(v);
    if (Number.isNaN(n)) return toast({ text: "Bitte nur eine Zahl, z. B. 30.000", error: true });
    if (n === goal) return;
    if (!(await setAreaGoal("sponsoren", n))) toast({ text: "Hat nicht geklappt. Bitte nochmal versuchen." });
  };

  return (
    <div className={cn(field, "max-md:col-span-2")}>
      {/* Gleicher Name wie auf der Übersicht; „inkl. Track-Partner“ erklärt den Unterschied zu „Sponsoren zugesagt“ daneben */}
      <h2 className="label-mono">Sponsoring zugesagt</h2>
      <span className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
        <span className="text-[22px] leading-none font-medium tracking-[-0.03em] whitespace-nowrap tabular">{formatEuro(secured)}</span>
        <label htmlFor="sponsoring-goal" className="text-[13px] text-fg-3">
          <span aria-hidden>von</span>
          <span className="sr-only">Sponsoring-Ziel in €</span>
        </label>
        <span className="-my-1 w-[124px]">
          <EditText
            id="sponsoring-goal"
            value={goal !== null ? formatEuro(goal) : null}
            placeholder="Ziel in €"
            inputMode="decimal"
            onSave={save}
            className="text-[13px] tabular"
          />
        </span>
      </span>
      <Bar value={Math.min(secured, goal ?? 0)} total={goal ?? 0} />
      <span className="text-[12px] text-fg-3">inkl. Track-Partner{prospect > 0 && ` · + ${formatEuro(prospect)} im Gespräch`}</span>
    </div>
  );
}

function PipelineField({ tab, orgs, today }: { tab: TabId; orgs: Organization[]; today: string }) {
  const def = TABS.find((t) => t.id === tab)!;
  const list = orgs.filter((o) => inTab(o, tab));
  const won = list.filter((o) => def.goalStages.includes(o.stage)).length;
  const follow = list.map((o) => followState(o, today));
  const dueToday = follow.filter((f) => f?.tone === "today").length;
  const overdue = follow.filter((f) => f?.tone === "red").length;
  const stages = STAGES.map((s) => ({
    ...s,
    n: list.filter((o) => o.stage === s.id).length,
  })).filter((s) => s.n > 0);

  return (
    <Link href={`/pipeline?tab=${tab}`} className={cn(field, "group/p transition-colors duration-150 hover:bg-hover max-md:col-span-2")}>
      <span className="flex items-center justify-between gap-3">
        <h2 className="label-mono truncate">{tab === "venues" ? def.goalLabel : `${def.goalLabel} zugesagt`}</h2>
        <span className="text-fg-3 transition-transform duration-150 group-hover/p:translate-x-0.5">
          <span aria-hidden>→</span>
          <span className="sr-only">Zur Pipeline</span>
        </span>
      </span>
      <span className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5">
        <Count value={won} total={def.goal ?? null} />
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-fg-2">
          {stages.length === 0 && <span className="text-fg-3">Noch keine Einträge</span>}
          {stages.map((s) => (
            <span key={s.id} className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <span className={cn("size-[7px] rounded-full", s.dot)} aria-hidden />
              {s.name} <span className="text-fg-3 tabular">{s.n}</span>
            </span>
          ))}
          {dueToday > 0 && <Chip tone="today">{dueToday} heute</Chip>}
          {overdue > 0 && <Chip tone="red">{overdue} überfällig</Chip>}
        </span>
      </span>
      {def.goal ? (
        <span className="flex gap-1" aria-hidden>
          {Array.from({ length: def.goal }, (_, i) => (
            <span key={i} className={cn("h-[3px] flex-1 rounded-sm", i < won ? "bg-acc-line" : "bg-line-2")} />
          ))}
        </span>
      ) : (
        <span className="h-[3px]" aria-hidden />
      )}
    </Link>
  );
}

// ---------------------------------------------------------------
// Notizen: Ablage fürs Teilprojekt (Maxi, 14.10.) im gemeinsamen Editor, speichert von selbst
// ---------------------------------------------------------------
function AreaNotes({ areaId, areaName, onCreateTask }: { areaId: string; areaName: string; onCreateTask: (title: string) => Promise<string | null> }) {
  const { me } = useTeam();
  const { data, save } = useAreaNotes(areaId);
  return (
    <NotesCard
      title="Notizen"
      label={`Notizen zu ${areaName}`}
      data={data}
      save={(md) => save(md, me?.id ?? null)}
      placeholder="Absprachen, Kontakte, Links, Ideen …"
      presenceKey={`area-${areaId}`}
      onCreateTask={onCreateTask}
    />
  );
}

// ---------------------------------------------------------------
// Meilensteine des Bereichs (inkl. Unterpunkte, die zu diesem Bereich gehören)
// ---------------------------------------------------------------
function MilestonesCard({
  milestones,
  own,
  today,
  onToggle,
}: {
  milestones: Milestone[];
  own: Milestone[];
  today: string;
  onToggle: (id: string, done: boolean) => Promise<boolean>;
}) {
  const sorted = [...own].sort((a, b) => a.due_date.localeCompare(b.due_date) || a.sort - b.sort);

  return (
    <section className={cn(card, "min-w-0 overflow-hidden")}>
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <h2 className="text-[14px] font-semibold">Meilensteine</h2>
        <Link href="/roadmap" className="rounded-md text-[12.5px] text-fg-2 hover:text-fg">
          Roadmap
        </Link>
      </div>
      {sorted.length === 0 && (
        <p className="border-t border-line px-4 py-6 text-[13.5px] text-fg-2">Keine Meilensteine.</p>
      )}
      <ul>
        {sorted.map((m) => {
          const subs = milestones.filter((s) => s.parent_id === m.id);
          const subsDone = subs.filter((s) => s.status === "erledigt").length;
          const parent = m.parent_id ? milestones.find((p) => p.id === m.parent_id) : null;
          const done = m.status === "erledigt";
          const status = done ? (
            <Chip tone="green">
              <Check className="size-3" strokeWidth={3} aria-hidden />
              erledigt
            </Chip>
          ) : daysBetween(today, m.due_date) <= 7 ? (
            <DueChip due={m.due_date} today={today} />
          ) : (
            <span className="text-[12.5px] text-fg-3 tabular">{formatShort(m.due_date)}</span>
          );
          return (
            <li key={m.id} className="relative flex min-h-14 items-center gap-3 border-t border-line px-4 py-2 has-[a:hover]:bg-hover md:min-h-12">
              {subs.length > 0 ? (
                // Meilensteine mit Unterpunkten werden in der Roadmap bzw. Übersicht abgeschlossen.
                <span className="grid size-[18px] shrink-0 place-items-center" title="Meilenstein mit Unterpunkten">
                  <svg
                    viewBox="0 0 24 24"
                    className={cn("size-[15px]", done ? "text-st-green" : "text-fg-3")}
                    fill={done ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M12 3 21 12 12 21 3 12z" />
                  </svg>
                </span>
              ) : (
                <StatusCheck status={done ? "erledigt" : "offen"} title={`${m.id} ${m.title}`} onToggle={() => onToggle(m.id, !done)} />
              )}
              <span className="w-[38px] shrink-0 font-mono text-[12px] text-fg-3">{m.id}</span>
              <span className="flex min-w-0 flex-1 flex-col gap-1 md:gap-0.5">
                {/* Am Handy darf der Titel umbrechen, Frist steht dann in der zweiten Zeile. */}
                <Link
                  href={`/roadmap?m=${m.id}`}
                  className={cn(
                    "min-w-0 rounded-sm text-[15px] leading-snug after:absolute after:inset-0 md:truncate md:text-[13.5px]",
                    done && "text-fg-2 line-through",
                  )}
                >
                  {m.title}
                </Link>
                <span
                  className={cn(
                    "flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-fg-3 tabular",
                    !parent && subs.length === 0 && "md:hidden",
                  )}
                >
                  <span className="md:hidden">{status}</span>
                  {(parent || subs.length > 0) && (
                    <span className="truncate">
                      {parent ? (
                        `Teil von ${parent.id}`
                      ) : (
                        <>
                          <span aria-hidden>
                            {subsDone}/{subs.length}
                          </span>
                          <span className="sr-only">
                            {subsDone} von {subs.length} Unterpunkten erledigt
                          </span>
                        </>
                      )}
                    </span>
                  )}
                </span>
              </span>
              <span className="hidden shrink-0 md:inline-flex">{status}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------
// Offene Aufgaben des Bereichs. Detail und Bearbeiten auf der Aufgaben-Seite (Filter bleibt gesetzt).
// ---------------------------------------------------------------
function TasksCard({
  areaId,
  tasks,
  milestones,
  orgs,
  today,
  onToggle,
  onNew,
}: {
  areaId: string;
  tasks: Task[];
  milestones: Milestone[];
  orgs: Organization[];
  today: string;
  onToggle: (t: Task) => void;
  onNew: () => void;
}) {
  const { personById } = useTeam();
  // Nur Offene; eine gerade abgehakte Aufgabe holt „Rückgängig“ im Hinweis zurück.
  const open = tasks.filter((t) => t.status !== "erledigt").sort(sortTasks);
  const done = tasks.length - open.length;

  return (
    <section className={cn(card, "min-w-0 overflow-hidden")}>
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3">
        <h2 className="flex items-center gap-2 text-[14px] font-semibold">
          Aufgaben
          {open.length > 0 && <span className="font-normal text-fg-3 tabular">{open.length} offen</span>}
        </h2>
        <button
          type="button"
          onClick={onNew}
          className="inline-flex h-8 items-center rounded-[9px] px-2.5 text-[13px] font-medium text-fg-2 shadow-[inset_0_0_0_1px_var(--line2)] transition-[background,color,scale] duration-150 hover:bg-hover hover:text-fg active:scale-[.97] max-md:h-10 md:hidden"
        >
          + Aufgabe
        </button>
      </div>

      {open.length === 0 ? (
        <p className="border-t border-line px-4 py-6 text-[13.5px] leading-normal text-fg-2">
          Keine offenen Aufgaben.
        </p>
      ) : (
        <ul>
          {open.map((t) => {
            const ms = milestones.find((m) => m.id === t.milestone_id);
            const org = t.organization_id ? orgs.find((o) => o.id === t.organization_id) : null;
            return (
              <li key={t.id} className="relative flex min-h-14 items-center gap-3 border-t border-line px-4 py-2 has-[a:hover]:bg-hover md:min-h-11">
                <StatusCheck status={t.status} title={t.title} onToggle={() => onToggle(t)} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5 md:flex-row md:items-center md:gap-3">
                  <Link
                    href={`/aufgaben?bereich=${areaId}&aufgabe=${t.id}`}
                    className="min-w-0 truncate rounded-sm text-[15px] after:absolute after:inset-0 md:flex-1 md:text-[13.5px]"
                  >
                    {t.title}
                  </Link>
                  {/* Höchstens die halbe Zeile, damit ein langer Firmenname den Titel nicht verdrängt (er kürzt sich selbst) */}
                  {(ms || t.due_date || org) && (
                    <span className="flex min-w-0 items-center gap-2 md:max-w-[50%]">
                      {org && <OrgName name={org.name} />}
                      {ms && (
                        <span className="font-mono text-[12px] text-fg-3" title={ms.title}>
                          {ms.id}
                        </span>
                      )}
                      {t.due_date && <DueChip due={t.due_date} today={today} />}
                    </span>
                  )}
                </span>
                <Avatar person={personById(t.assignee_id)} size={22} />
              </li>
            );
          })}
        </ul>
      )}

      {done > 0 && (
        <Link
          href={`/aufgaben?bereich=${areaId}`}
          className="flex min-h-11 items-center gap-2 border-t border-line px-4 text-[12.5px] text-fg-2 hover:bg-hover hover:text-fg"
        >
          <span className="size-2 rounded-full bg-st-green" aria-hidden />
          {done} erledigt
        </Link>
      )}
    </section>
  );
}

export function AreaSkeleton() {
  const block = "rounded-[14px] bg-card-2";
  return (
    <>
      <PageHeader title="Bereich" />
      <div
        className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-3.5 pt-2 pb-8 md:gap-5 md:px-8 md:pt-8"
        aria-busy="true"
        aria-label="Bereich lädt"
      >
        <div className="h-7 w-44 rounded-md bg-card-2 md:hidden" />
        <div className={cn(block, "h-[104px]")} />
        <div className="grid gap-4 md:gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className={cn(block, "h-[460px]")} />
          <div className={cn(block, "h-[460px]")} />
        </div>
      </div>
    </>
  );
}
