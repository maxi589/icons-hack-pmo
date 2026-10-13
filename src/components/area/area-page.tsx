"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/avatar";
import { Chip, DueChip } from "@/components/chip";
import { useToast } from "@/components/toast";
import { PageHeader } from "@/components/app-shell/page-header";
import { useTeam } from "@/components/app-shell/team-provider";
import { StatusCheck } from "@/components/tasks/status-check";
import { play } from "@/lib/sounds";
import { useToday } from "@/lib/use-today";
import { daysBetween, formatShort } from "@/lib/dates";
import { useMilestones, type Milestone } from "@/lib/data/use-milestones";
import { useTasks } from "@/lib/data/use-tasks";
import { useOrganizations } from "@/lib/data/use-organizations";
import { logActivity } from "@/lib/data/use-feed";
import { followState, inTab, STAGES, TABS, type Organization, type TabId } from "@/lib/pipeline";
import { sortTasks, taskStatusName, type Task, type TaskStatus } from "@/lib/tasks";

// Bereichs-Seite (Umfang v1): verantwortliche Person, Fortschritt, Meilensteine und Aufgaben eines Teilprojekts.
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
  const toast = useToast();
  const { me, areaById } = useTeam();
  const { milestones, setMilestoneDone } = useMilestones();
  const { tasks, update } = useTasks();
  const { orgs } = useOrganizations();

  const area = areaById(id);
  const tab = PIPELINE_TAB[id] ?? null;
  const newTask = () => router.push(`/aufgaben?bereich=${id}&neu=1`);

  if (!today || !area || !milestones || !tasks || (tab && !orgs)) {
    return <AreaSkeleton />;
  }

  const own = milestones.filter((m) => m.area_id === id);
  const areaTasks = tasks.filter((t) => t.area_id === id);

  /** Abhaken wie auf der Aufgaben-Seite: sofort speichern, 5 s „Rückgängig“, danach Eintrag im Verlauf. */
  const toggleTask = (task: Task) => {
    const from = task.status;
    const to: TaskStatus = from === "erledigt" ? "offen" : "erledigt";
    update(task.id, { status: to });
    if (to === "erledigt") play("taskDone");
    toast({
      text: to === "erledigt" ? `„${task.title}“ erledigt` : `„${task.title}“ → ${taskStatusName(to)}`,
      onAction: () => update(task.id, { status: from }),
      onExpire: () =>
        logActivity("task", task.id, me?.id ?? null, "status_changed", {
          from,
          to,
        }),
    });
  };

  const openCount = areaTasks.filter((t) => t.status !== "erledigt").length;

  return (
    <>
      <PageHeader title={area.name} action={{ label: "Aufgabe", onClick: newTask }} />
      <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-4 px-3.5 pt-2 pb-8 md:gap-5 md:px-8 md:pt-8 md:pb-12">
        <div className="flex flex-col gap-1.5 pb-1.5">
          <h1 className="flex items-center gap-2.5 text-[21px] font-semibold tracking-[-0.025em] md:text-[26px]">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: area.color }} aria-hidden />
            {area.name}
          </h1>
          <p className="text-[14px] text-fg-2 tabular">
            Teilprojekt · {own.length} {own.length === 1 ? "Meilenstein" : "Meilensteine"} · {openCount}{" "}
            {openCount === 1 ? "offene Aufgabe" : "offene Aufgaben"}
          </p>
        </div>

        <div className="flex flex-wrap gap-4">
          <OwnerCard areaId={id} />
          <ProgressCard own={own} tasks={areaTasks} tab={tab} orgs={orgs ?? []} today={today} />
        </div>

        <div className="flex flex-wrap items-start gap-4">
          <MilestonesCard milestones={milestones} own={own} today={today} onToggle={setMilestoneDone} />
          <TasksCard areaId={id} tasks={areaTasks} milestones={milestones} today={today} onToggle={toggleTask} onNew={newTask} />
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------
// Verantwortliche Person (speichert sofort, live für alle)
// ---------------------------------------------------------------
function OwnerCard({ areaId }: { areaId: string }) {
  const { areaById, people, personById, setAreaOwner } = useTeam();
  const toast = useToast();
  const area = areaById(areaId)!;
  const owner = personById(area.owner_id);

  const change = async (value: string) => {
    const ok = await setAreaOwner(areaId, value || null);
    if (!ok) toast({ text: "Hat nicht geklappt. Bitte nochmal versuchen." });
  };

  return (
    <section className={cn(card, "flex min-w-0 flex-[1_1_300px] flex-col gap-4 px-5 py-[18px] md:px-6 md:py-[22px]")}>
      <h2 className="label-mono">Verantwortlich</h2>
      <div className="flex min-w-0 items-center gap-3">
        <Avatar person={owner} size={36} />
        {owner ? (
          <span className="truncate text-[16.5px] font-semibold tracking-[-0.01em]">{owner.name}</span>
        ) : (
          <span className="flex flex-col gap-0.5">
            <span className="text-[15px] font-medium text-st-amber">Verantwortlich offen</span>
            <span className="text-[13px] text-fg-2">Wer kümmert sich um {area.name}?</span>
          </span>
        )}
      </div>
      <label className="relative mt-auto inline-flex w-full items-center sm:w-[200px]">
        <span className="sr-only">Verantwortliche Person für {area.name}</span>
        <select
          value={area.owner_id ?? ""}
          onChange={(e) => change(e.target.value)}
          className="h-9 w-full cursor-pointer appearance-none rounded-[9px] border border-field bg-card pr-8 pl-3 text-[13.5px] text-fg transition-colors duration-150 hover:bg-hover focus-visible:outline-solid max-md:h-11 max-md:text-base"
        >
          <option value="">Noch offen</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 size-3.5 text-fg-3" aria-hidden />
      </label>
    </section>
  );
}

// ---------------------------------------------------------------
// Fortschritt: Pipeline-Ziel (falls vorhanden), Meilensteine, Aufgaben
// ---------------------------------------------------------------
function Bar({ value, total }: { value: number; total: number }) {
  return (
    <div className="h-[3px] flex-1 overflow-hidden rounded-sm bg-line-2">
      <div
        className="h-full rounded-sm bg-acc-line transition-[width] duration-300 ease-out"
        style={{ width: `${total ? (value / total) * 100 : 0}%` }}
      />
    </div>
  );
}

function ProgressCard({ own, tasks, tab, orgs, today }: { own: Milestone[]; tasks: Task[]; tab: TabId | null; orgs: Organization[]; today: string }) {
  const msDone = own.filter((m) => m.status === "erledigt").length;
  const taskDone = tasks.filter((t) => t.status === "erledigt").length;

  return (
    <section className={cn(card, "flex min-w-0 flex-[1.45_1_440px] flex-col gap-4 px-5 py-[18px] md:px-6 md:py-[22px]")}>
      <h2 className="label-mono">Fortschritt</h2>
      {tab && <PipelineGoal tab={tab} orgs={orgs} today={today} />}
      <div className="flex flex-col gap-3">
        <ProgressRow label="Meilensteine" value={msDone} total={own.length} />
        <ProgressRow label="Aufgaben" value={taskDone} total={tasks.length} empty="Noch keine Aufgaben" />
      </div>
    </section>
  );
}

function ProgressRow({ label, value, total, empty }: { label: string; value: number; total: number; empty?: string }) {
  return (
    <div className="flex items-center gap-3 text-[13px]">
      <span className="w-[92px] shrink-0 text-fg-2">{label}</span>
      {total === 0 && empty ? (
        <span className="text-fg-3">{empty}</span>
      ) : (
        <>
          <Bar value={value} total={total} />
          <span className="w-[104px] shrink-0 text-right text-fg-3 tabular">
            {value} von {total} erledigt
          </span>
        </>
      )}
    </div>
  );
}

function PipelineGoal({ tab, orgs, today }: { tab: TabId; orgs: Organization[]; today: string }) {
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
    <Link
      href={`/pipeline?tab=${tab}`}
      className="flex flex-col gap-3 rounded-[10px] px-3.5 py-3 shadow-[0_0_0_1px_var(--line)] transition-[background,box-shadow] duration-150 hover:bg-hover hover:shadow-[0_0_0_1px_var(--line2)]"
    >
      <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-[13px] text-fg-2">{tab === "venues" ? def.goalLabel : `${def.goalLabel} zugesagt`}</span>
        <span className="flex items-baseline gap-1.5">
          <span className="text-[26px] leading-none font-medium tracking-[-0.04em] tabular">{won}</span>
          <span className="text-[14px] text-fg-3 tabular">{def.goal ? `/ ${def.goal}` : "Ziel offen"}</span>
        </span>
      </span>
      {def.goal && (
        <span className="flex gap-1" aria-hidden>
          {Array.from({ length: def.goal }, (_, i) => (
            <span key={i} className={cn("h-1 flex-1 rounded-sm", i < won ? "bg-acc-line" : "bg-line-2")} />
          ))}
        </span>
      )}
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12.5px] text-fg-2">
        {stages.length === 0 && <span className="text-fg-3">Noch keine Einträge in der Pipeline</span>}
        {stages.map((s) => (
          <span key={s.id} className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className={cn("size-[7px] rounded-full", s.dot)} aria-hidden />
            {s.name} <span className="text-fg-3 tabular">{s.n}</span>
          </span>
        ))}
        {(dueToday > 0 || overdue > 0) && (
          <span className="flex gap-1.5">
            {dueToday > 0 && <Chip tone="today">{dueToday} heute nachfassen</Chip>}
            {overdue > 0 && (
              <Chip tone="red" dot>
                {overdue} überfällig
              </Chip>
            )}
          </span>
        )}
        <span className="ml-auto text-fg-3">Zur Pipeline →</span>
      </span>
    </Link>
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
    <section className={cn(card, "min-w-0 flex-[1_1_420px] overflow-hidden")}>
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <h2 className="text-[14px] font-semibold">Meilensteine</h2>
        <Link href="/roadmap" className="rounded-md text-[12.5px] text-fg-2 hover:text-fg">
          Roadmap
        </Link>
      </div>
      {sorted.length === 0 && (
        <p className="border-t border-line px-4 py-6 text-[13.5px] text-fg-2">Diesem Bereich ist kein Meilenstein zugeordnet.</p>
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
                    <span className="truncate">{parent ? `Teil von ${parent.id}` : `${subsDone} von ${subs.length} Unterpunkten erledigt`}</span>
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
  today,
  onToggle,
  onNew,
}: {
  areaId: string;
  tasks: Task[];
  milestones: Milestone[];
  today: string;
  onToggle: (t: Task) => void;
  onNew: () => void;
}) {
  const { personById } = useTeam();
  // Nur Offene; eine gerade abgehakte Aufgabe holt „Rückgängig“ im Hinweis zurück.
  const open = tasks.filter((t) => t.status !== "erledigt").sort(sortTasks);
  const done = tasks.length - open.length;

  return (
    <section className={cn(card, "min-w-0 flex-[1_1_420px] overflow-hidden")}>
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3">
        <h2 className="flex items-center gap-2 text-[14px] font-semibold">
          Aufgaben
          {open.length > 0 && <span className="font-normal text-fg-3 tabular">{open.length} offen</span>}
        </h2>
        <span className="flex items-center gap-1">
          <Link href={`/aufgaben?bereich=${areaId}`} className="rounded-md px-1.5 py-1 text-[12.5px] text-fg-2 hover:text-fg">
            Alle
          </Link>
          <button
            type="button"
            onClick={onNew}
            className="inline-flex h-8 items-center rounded-[9px] px-2.5 text-[13px] font-medium text-fg-2 shadow-[inset_0_0_0_1px_var(--line2)] transition-[background,color,scale] duration-150 hover:bg-hover hover:text-fg active:scale-[.97] max-md:h-10"
          >
            + Aufgabe
          </button>
        </span>
      </div>

      {open.length === 0 ? (
        <p className="border-t border-line px-4 py-6 text-[13.5px] leading-normal text-fg-2">
          {tasks.length === 0 ? "Noch keine Aufgaben in diesem Bereich." : "Alles erledigt. Nichts offen in diesem Bereich."}
        </p>
      ) : (
        <ul>
          {open.map((t) => {
            const ms = milestones.find((m) => m.id === t.milestone_id);
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
                  {(ms || t.due_date) && (
                    <span className="flex shrink-0 items-center gap-2">
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
        className="mx-auto flex w-full max-w-[1080px] flex-col gap-4 px-3.5 pt-2 pb-8 md:gap-5 md:px-8 md:pt-8"
        aria-busy="true"
        aria-label="Bereich lädt"
      >
        <div className="flex flex-col gap-2 pb-1.5">
          <div className="h-7 w-44 rounded-md bg-card-2" />
          <div className="h-4 w-64 rounded-md bg-card-2" />
        </div>
        <div className="flex flex-wrap gap-4">
          <div className={cn(block, "h-[180px] min-w-0 flex-[1_1_300px]")} />
          <div className={cn(block, "h-[180px] min-w-0 flex-[1.45_1_440px]")} />
        </div>
        <div className="flex flex-wrap gap-4">
          <div className={cn(block, "h-[260px] min-w-0 flex-[1_1_420px]")} />
          <div className={cn(block, "h-[260px] min-w-0 flex-[1_1_420px]")} />
        </div>
      </div>
    </>
  );
}
