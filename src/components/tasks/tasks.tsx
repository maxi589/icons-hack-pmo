"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/avatar";
import { DueChip } from "@/components/chip";
import { Segmented } from "@/components/segmented";
import { useToast } from "@/components/toast";
import { MobileSheet } from "@/components/mobile-sheet";
import { PageHeader } from "@/components/app-shell/page-header";
import { useTeam } from "@/components/app-shell/team-provider";
import { KanbanBoard, KanbanCard, KanbanCards, KanbanHeader, KanbanProvider } from "@/components/ui/kanban";
import { play } from "@/lib/sounds";
import { useToday } from "@/lib/use-today";
import { useIsMobile } from "@/lib/use-is-mobile";
import { useMilestones, type Milestone } from "@/lib/data/use-milestones";
import { useTasks, type TaskPatch } from "@/lib/data/use-tasks";
import { logActivity, notifyAssignment } from "@/lib/data/use-feed";
import { DUE_GROUPS, dueGroup, milestoneOptions, sortTasks, TASK_STATUSES, taskStatusName, type Task, type TaskStatus } from "@/lib/tasks";
import { NewTaskDialog } from "./new-task-dialog";
import { StatusCheck } from "./status-check";
import { TaskDetail } from "./task-detail";

// Aufgaben (Umfang v1): Board und Liste, Filter nach Bereich, Person und Meilenstein.
// „Meine Aufgaben“ ist dieselbe Seite, fest auf die angemeldete Person und nach Fälligkeit gruppiert.
// Zustand in der Adresse (teilbar): ?aufgabe=<id>, ?bereich=, ?person= (id oder „offen“), ?meilenstein=, ?neu=1.

type View = "board" | "list";

const filterCls =
  "h-8 cursor-pointer appearance-none rounded-[9px] border border-field bg-card pr-7 pl-2.5 text-[13px] text-fg focus-visible:outline-solid max-md:h-10 max-md:text-base";

function FilterSelect({
  label,
  value,
  onChange,
  wide = false,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("relative inline-flex min-w-0 items-center max-md:flex-1", wide ? "md:w-[240px] max-md:basis-full" : "md:w-[160px]")}>
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={cn(filterCls, "w-full", value && "bg-active")}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 size-3.5 text-fg-3" aria-hidden />
    </label>
  );
}

export function Tasks({ mine = false }: { mine?: boolean }) {
  const today = useToday();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const toast = useToast();
  const isMobile = useIsMobile();
  const { me, people, allAreas } = useTeam();
  const { tasks, update, create, remove, restore } = useTasks();
  const { milestones } = useMilestones();

  const [view, setView] = useState<View>("list");
  const [showDone, setShowDone] = useState(false);

  const selectedId = params.get("aufgabe");
  const newOpen = params.get("neu") === "1";
  const fArea = params.get("bereich") ?? "";
  const fPerson = mine ? (me?.id ?? "") : (params.get("person") ?? "");
  const fMs = params.get("meilenstein") ?? "";
  const title = mine ? "Meine Aufgaben" : "Aufgaben";

  const setParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const all = useMemo(() => tasks ?? [], [tasks]);
  const selected = all.find((t) => t.id === selectedId) ?? null;
  const msList = milestones ?? [];

  // Meilenstein-Filter umfasst die Unterpunkte (Filter „M1“ zeigt auch Aufgaben an M1.2).
  const msMatch = (t: Task) => !fMs || t.milestone_id === fMs || msList.find((m) => m.id === t.milestone_id)?.parent_id === fMs;
  const visible = all
    .filter((t) => !fArea || t.area_id === fArea)
    .filter((t) => !fPerson || (fPerson === "offen" ? !t.assignee_id : t.assignee_id === fPerson))
    .filter(msMatch)
    .sort(sortTasks);
  const filtered = !!(fArea || (!mine && fPerson) || fMs);

  /** Status ändern: sofort speichern, 5 s „Rückgängig“, danach Eintrag im Verlauf. */
  const changeStatus = (task: Task, to: TaskStatus) => {
    const from = task.status;
    if (from === to) return;
    update(task.id, { status: to });
    if (to === "erledigt") play("taskDone");
    toast({
      text: to === "erledigt" ? `„${task.title}“ erledigt` : `„${task.title}“ → ${taskStatusName(to)}`,
      onAction: () => update(task.id, { status: from }),
      onExpire: () => logActivity("task", task.id, me?.id ?? null, "status_changed", { from, to }),
    });
  };

  const deleteTask = (task: Task) => {
    setParams({ aufgabe: null });
    remove(task);
    toast({ text: `„${task.title}“ gelöscht`, onAction: () => restore(task) });
  };

  const open = (id: string) => setParams({ aufgabe: id });
  const close = () => setParams({ aufgabe: null });

  if (!tasks || !milestones || !today || (mine && !me)) {
    return (
      <>
        <PageHeader title={title} />
        <div className="m-3.5 h-[420px] rounded-xl bg-card-2 md:m-5" aria-busy="true" aria-label={`${title} lädt`} />
      </>
    );
  }

  const detail = selected && (
    <TaskDetail
      key={selected.id}
      task={selected}
      today={today}
      milestones={msList}
      onUpdate={(p: TaskPatch) => update(selected.id, p)}
      onStatus={(to) => changeStatus(selected, to)}
      onDelete={() => deleteTask(selected)}
      onClose={close}
    />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title={title} action={{ label: "Aufgabe", onClick: () => setParams({ neu: "1" }) }}>
        <Segmented
          label="Ansicht"
          value={view}
          onChange={setView}
          options={[
            { value: "list", label: "Liste" },
            { value: "board", label: "Board" },
          ]}
        />
      </PageHeader>
      {/* Links Filter und Inhalt; rechts das Detail über die volle Höhe unter der Kopfzeile */}
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
      <h1 className="px-3.5 pt-2 pb-2 text-[21px] font-semibold tracking-[-0.025em] md:sr-only">{title}</h1>

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-2 px-3.5 pb-3 md:border-b md:border-line md:px-[18px] md:py-3">
        <FilterSelect label="Bereich" value={fArea} onChange={(v) => setParams({ bereich: v })}>
          <option value="">Alle Bereiche</option>
          {allAreas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </FilterSelect>
        {!mine && (
          <FilterSelect label="Person" value={fPerson} onChange={(v) => setParams({ person: v })}>
            <option value="">Alle Personen</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            <option value="offen">Noch niemand</option>
          </FilterSelect>
        )}
        <FilterSelect wide label="Meilenstein" value={fMs} onChange={(v) => setParams({ meilenstein: v })}>
          <option value="">Alle Meilensteine</option>
          {milestoneOptions(msList).map((m) => (
            <option key={m.id} value={m.id}>
              {`${m.parent_id ? "   " : ""}${m.id} · ${m.title}`}
            </option>
          ))}
        </FilterSelect>
        {filtered && (
          <button
            type="button"
            onClick={() => setParams({ bereich: null, person: null, meilenstein: null })}
            className="h-8 rounded-[9px] px-2.5 text-[13px] text-fg-2 hover:bg-hover hover:text-fg max-md:h-10"
          >
            Filter zurücksetzen
          </button>
        )}
        <button
          type="button"
          onClick={() => setParams({ neu: "1" })}
          className="inline-flex h-10 items-center rounded-[9px] bg-acc px-3.5 text-[14px] font-medium text-acc-text md:hidden"
        >
          + Aufgabe
        </button>
      </div>

      {all.length === 0 ? (
        <EmptyState onNew={() => setParams({ neu: "1" })} />
      ) : (
          <div className="min-h-0 min-w-0 flex-1 md:overflow-auto">
            {view === "board" && (
              <div className="hidden p-3.5 pb-5 md:block">
                <KanbanProvider
                  columns={TASK_STATUSES.map((s) => ({ id: s.id, name: s.name }))}
                  data={visible.map((t) => ({ id: t.id, name: t.title, column: t.status }))}
                  onMove={(id, to) => {
                    const task = all.find((t) => t.id === id);
                    if (task) changeStatus(task, to as TaskStatus);
                  }}
                  className="min-h-[calc(100dvh-210px)]"
                >
                  {(col) => {
                    const st = TASK_STATUSES.find((s) => s.id === col.id)!;
                    const count = visible.filter((t) => t.status === st.id).length;
                    return (
                      <KanbanBoard key={col.id} id={col.id} className="w-[290px] shrink-0">
                        <KanbanHeader>
                          <span className={cn("size-2 rounded-full", st.dot)} aria-hidden />
                          <span className="text-[12.5px] font-semibold">{st.name}</span>
                          <span className="text-[12px] text-fg-3 tabular">{count}</span>
                        </KanbanHeader>
                        <KanbanCards<{ id: string; name: string; column: string }>
                          id={col.id}
                          className="flex-1"
                          empty={
                            <div className="flex min-h-[70px] items-center justify-center rounded-[10px] border border-dashed border-line-2 p-2 text-center text-[12px] text-fg-3">
                              Noch leer
                            </div>
                          }
                        >
                          {(item) => {
                            const task = all.find((t) => t.id === item.id)!;
                            return (
                              <KanbanCard key={item.id} id={item.id}>
                                <TaskCard task={task} today={today} milestones={msList} selected={task.id === selectedId} onOpen={() => open(task.id)} />
                              </KanbanCard>
                            );
                          }}
                        </KanbanCards>
                      </KanbanBoard>
                    );
                  }}
                </KanbanProvider>
              </div>
            )}
            <div className={cn(view === "board" && "md:hidden")}>
              <TaskList
                tasks={visible}
                milestones={msList}
                today={today}
                byDue={mine}
                showDone={showDone}
                onShowDone={() => setShowDone((v) => !v)}
                selectedId={selectedId}
                onOpen={open}
                onToggle={(t) => changeStatus(t, t.status === "erledigt" ? "offen" : "erledigt")}
              />
            </div>
            {visible.length === 0 && (
              <p className="px-5 py-8 text-center text-[13.5px] text-fg-2">{mine && !filtered ? "Dir ist gerade nichts zugewiesen." : "Keine Treffer. Filter anpassen."}</p>
            )}
          </div>
      )}
        </div>

        {selected && !isMobile && (
          <aside aria-label="Aufgaben-Detail" className="w-[400px] shrink-0 overflow-y-auto border-l border-line bg-card">
            {detail}
          </aside>
        )}
      </div>

      <MobileSheet open={!!selected && isMobile} onClose={close} title={selected?.title ?? ""}>
        {detail}
      </MobileSheet>

      <NewTaskDialog
        open={newOpen}
        onOpenChange={(o) => !o && setParams({ neu: null })}
        milestones={msList}
        defaults={{
          area_id: fArea || null,
          milestone_id: fMs || null,
          ...(mine ? {} : fPerson ? { assignee_id: fPerson === "offen" ? null : fPerson } : {}),
        }}
        onCreate={async (input) => {
          const task = await create({ ...input, created_by: me?.id ?? null });
          if (!task) return false;
          logActivity("task", task.id, me?.id ?? null, "created");
          notifyAssignment("task", task.id, me?.id ?? null, task.assignee_id);
          setParams({ neu: null });
          toast({ text: `„${task.title}“ angelegt`, actionLabel: "Öffnen", onAction: () => open(task.id) });
          return true;
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------
// Karte im Board
// ---------------------------------------------------------------
function TaskMeta({ task, milestones }: { task: Task; milestones: Milestone[] }) {
  const { areaById } = useTeam();
  const area = areaById(task.area_id);
  const ms = milestones.find((m) => m.id === task.milestone_id);
  if (!area && !ms) return null;
  return (
    <span className="flex min-w-0 items-center gap-2 text-[12px] text-fg-2">
      {ms && (
        <span className="shrink-0 font-mono text-fg-3" title={ms.title}>
          {ms.id}
        </span>
      )}
      {area && (
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <span className="size-[7px] shrink-0 rounded-full" style={{ background: area.color }} aria-hidden />
          <span className="truncate">{area.name}</span>
        </span>
      )}
    </span>
  );
}

function TaskCard({ task, today, milestones, selected, onOpen }: { task: Task; today: string; milestones: Milestone[]; selected: boolean; onOpen: () => void }) {
  const { personById } = useTeam();
  const done = task.status === "erledigt";
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "flex w-full cursor-pointer flex-col gap-2 rounded-[10px] bg-card px-3 py-[11px] text-left transition-shadow duration-150",
        selected ? "shadow-[0_0_0_1.5px_var(--accLine),0_1px_2px_rgba(0,0,0,.2)]" : "shadow-card hover:shadow-[0_0_0_1px_var(--line2)]"
      )}
    >
      <span className={cn("text-[13px] leading-[1.35] font-medium", done && "text-fg-2 line-through")}>{task.title}</span>
      <TaskMeta task={task} milestones={milestones} />
      {((task.due_date && !done) || task.assignee_id) && (
        <span className="flex w-full items-center gap-1.5">
          {task.due_date && !done && <DueChip due={task.due_date} today={today} />}
          <span className="ml-auto">
            <Avatar person={personById(task.assignee_id)} size={20} />
          </span>
        </span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------
// Liste (Handy immer, Desktop Standard). Gruppen nach Status bzw. bei „Meine Aufgaben“ nach Fälligkeit.
// Erledigte sind eingeklappt.
// ---------------------------------------------------------------
function TaskList({
  tasks,
  milestones: msList,
  today,
  byDue,
  showDone,
  onShowDone,
  selectedId,
  onOpen,
  onToggle,
}: {
  tasks: Task[];
  milestones: Milestone[];
  today: string;
  byDue: boolean;
  showDone: boolean;
  onShowDone: () => void;
  selectedId: string | null;
  onOpen: (id: string) => void;
  onToggle: (t: Task) => void;
}) {
  const openTasks = tasks.filter((t) => t.status !== "erledigt");
  const done = tasks.filter((t) => t.status === "erledigt").sort((a, b) => (b.done_at ?? "").localeCompare(a.done_at ?? ""));

  const groups: { key: string; name: string; dot?: string; red?: boolean; items: Task[] }[] = byDue
    ? DUE_GROUPS.map((g) => ({ key: g.id, name: g.name, red: g.id === "overdue", items: openTasks.filter((t) => dueGroup(t, today) === g.id) }))
    : TASK_STATUSES.filter((s) => s.id !== "erledigt").map((s) => ({ key: s.id, name: s.name, dot: s.dot, items: openTasks.filter((t) => t.status === s.id) }));

  const section = (key: string, items: Task[]) => (
    <ul key={key} className="overflow-hidden rounded-xl bg-card shadow-card">
      {items.map((t) => (
        <TaskRow key={t.id} task={t} today={today} milestones={msList} selected={t.id === selectedId} onOpen={() => onOpen(t.id)} onToggle={() => onToggle(t)} />
      ))}
    </ul>
  );

  return (
    <div className="flex flex-col gap-4 px-3.5 pb-8 md:px-[18px] md:py-4">
      {groups
        .filter((g) => g.items.length)
        .map((g) => (
          <section key={g.key} className="flex flex-col gap-2">
            <h2 className={cn("flex items-center gap-2 px-1 text-[12.5px] font-semibold", g.red && "text-st-red")}>
              {g.dot && <span className={cn("size-2 rounded-full", g.dot)} aria-hidden />}
              {g.name}
              <span className={cn("font-normal tabular", g.red ? "text-st-red" : "text-fg-3")}>{g.items.length}</span>
            </h2>
            {section(g.key, g.items)}
          </section>
        ))}
      {done.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2>
            <button
              type="button"
              aria-expanded={showDone}
              onClick={onShowDone}
              className="flex min-h-8 items-center gap-2 rounded-md px-1 text-[12.5px] font-semibold text-fg-2 hover:text-fg max-md:min-h-11"
            >
              <span className="size-2 rounded-full bg-st-green" aria-hidden />
              Erledigt
              <span className="font-normal text-fg-3 tabular">{done.length}</span>
              <ChevronDown className={cn("size-3.5 text-fg-3 transition-transform duration-200", showDone && "rotate-180")} aria-hidden />
            </button>
          </h2>
          {showDone && section("done", done)}
        </section>
      )}
    </div>
  );
}

function TaskRow({
  task,
  today,
  milestones,
  selected,
  onOpen,
  onToggle,
}: {
  task: Task;
  today: string;
  milestones: Milestone[];
  selected: boolean;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const { personById } = useTeam();
  const done = task.status === "erledigt";
  return (
    <li className={cn("relative flex min-h-14 items-center gap-3 border-t border-line px-3.5 py-2 first:border-t-0 md:min-h-11", selected ? "bg-active" : "hover:bg-hover")}>
      <StatusCheck status={task.status} title={task.title} onToggle={onToggle} />
      <span className="flex min-w-0 flex-1 flex-col gap-1 md:flex-row md:items-center md:gap-3">
        <button
          type="button"
          onClick={onOpen}
          aria-current={selected ? "true" : undefined}
          className={cn(
            "min-w-0 truncate rounded-sm text-left text-[15px] after:absolute after:inset-0 md:flex-1 md:text-[13.5px]",
            done && "text-fg-2 line-through"
          )}
        >
          {task.title}
        </button>
        <span className="flex min-w-0 items-center gap-2 md:shrink-0">
          <TaskMeta task={task} milestones={milestones} />
          {task.due_date && !done && (
            <span className="md:hidden">
              <DueChip due={task.due_date} today={today} />
            </span>
          )}
        </span>
      </span>
      {task.due_date && !done && (
        <span className="hidden md:inline-flex">
          <DueChip due={task.due_date} today={today} />
        </span>
      )}
      <Avatar person={personById(task.assignee_id)} size={22} />
    </li>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="m-3.5 flex flex-col items-center gap-2.5 rounded-[14px] bg-card-2 px-4 py-12 text-center md:m-5">
      <p className="text-sm font-medium">Noch keine Aufgaben</p>
      <button type="button" onClick={onNew} className="mt-1 inline-flex h-8 items-center rounded-[9px] bg-acc px-3 text-[13px] font-medium text-acc-text max-md:h-10">
        + Aufgabe
      </button>
    </div>
  );
}
