"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/avatar";
import { AreaGlyph } from "@/components/area-glyph";
import { Chip, DueChip } from "@/components/chip";
import { Countdown } from "@/components/countdown";
import { useTeam } from "@/components/app-shell/team-provider";
import { useToday } from "@/lib/use-today";
import { daysBetween, EVENT_START_LABEL, formatDayMonth, formatHeaderDate, formatLong, formatShort, relativeDays } from "@/lib/dates";
import { currentPhase, FOLLOW_UP_ROUNDS, phaseFill, PHASES, WAVE_1 } from "@/lib/phases";
import { MilestoneChecklist } from "@/components/milestone-checklist";
import { OwnersDialog } from "./owners-dialog";
import { TodayCard } from "./today-card";
import { useOverviewData, type Milestone, type Org, type Task } from "./use-overview-data";

// Übersicht (Board „Richtung A Graphit“): Wo stehen wir? Was ist als Nächstes dran? Wer ist zuständig?

const card = "rounded-[14px] bg-card shadow-card";

/** „noch 4 Tage Vorbereitung“ bzw. „letzter Tag Vorbereitung“ */
function phaseLeft(today: string, phase: number) {
  const n = daysBetween(today, PHASES[phase].end);
  if (n < 0) return PHASES[phase].name;
  return n === 0 ? `letzter Tag ${PHASES[phase].name}` : `noch ${n} ${n === 1 ? "Tag" : "Tage"} ${PHASES[phase].name}`;
}

export function Overview() {
  const today = useToday();
  const { data, setMilestoneDone } = useOverviewData();

  if (!today || !data) return <OverviewSkeleton />;

  const phase = currentPhase(today);

  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-4 px-3.5 pt-2 pb-8 md:gap-5 md:px-8 md:pt-8 md:pb-12">
      {/* Ohne Begrüßung (Maxi, 14.10.): eine Zeile mit Datum und Restzeit der Phase */}
      <h1 className="sr-only">Übersicht</h1>
      <p className="label-mono -mb-1 pt-1 md:pt-0">
        <span className="max-md:hidden">{formatLong(today)} · </span>
        Phase {phase + 1} von {PHASES.length} · {phaseLeft(today, phase)}
      </p>

      <div className="flex flex-wrap gap-4">
        <CountdownCard today={today} phase={phase} />
        <TodayCard tasks={data.tasks} orgs={data.orgs} today={today} />
        <NextMilestoneCard milestones={data.milestones} today={today} onToggle={setMilestoneDone} />
      </div>

      <GoalTiles orgs={data.orgs} milestones={data.milestones} />

      <div className="flex flex-wrap gap-4">
        <DueCard milestones={data.milestones} tasks={data.tasks} today={today} />
        <FollowUpCard orgs={data.orgs} today={today} />
      </div>

      <AreasSection milestones={data.milestones} today={today} />
    </div>
  );
}

// ---------------------------------------------------------------
// Countdown mit Phasen-Leiste
// ---------------------------------------------------------------
function CountdownCard({ today, phase }: { today: string; phase: number }) {
  return (
    <section className={cn(card, "flex min-w-0 flex-[1.45_1_440px] flex-col justify-between gap-[22px] px-5 py-[18px] md:px-6 md:py-[22px]")}>
      <h2 className="label-mono">Countdown</h2>
      <Countdown />
      <p className="-mt-2 text-[13px] text-fg-2">Bis zum Hackathon am {EVENT_START_LABEL} · 24 Stunden</p>
      <ol className="grid grid-cols-5 gap-1.5" aria-label="Phasen">
        {PHASES.map((p, i) => (
          <li key={p.name} className="flex flex-col gap-2" aria-current={i === phase ? "step" : undefined}>
            <div className="h-1 overflow-hidden rounded-sm bg-line-2">
              <div className="h-full rounded-sm bg-acc-line" style={{ width: `${Math.round(phaseFill(i, today) * 100)}%` }} />
            </div>
            <div className="hidden flex-col gap-0.5 sm:flex">
              <span className={cn("text-[12.5px] font-medium", i === phase ? "text-fg" : "text-fg-3")}>{p.name}</span>
              <span className="text-[11.5px] text-fg-3 tabular">{p.label}</span>
            </div>
            <span className="sr-only sm:hidden">
              {p.name} {p.label}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ---------------------------------------------------------------
// Nächster Meilenstein mit Unterpunkten zum Abhaken
// ---------------------------------------------------------------
function NextMilestoneCard({
  milestones,
  today,
  onToggle,
}: {
  milestones: Milestone[];
  today: string;
  onToggle: (id: string, done: boolean) => Promise<boolean>;
}) {
  const next = milestones.find((m) => !m.parent_id && m.status !== "erledigt");

  if (!next) {
    return (
      <section className={cn(card, "flex min-w-0 flex-[1_1_320px] flex-col gap-3 px-5 py-[18px] md:px-6 md:py-[22px]")}>
        <h2 className="label-mono">Nächster Meilenstein</h2>
        <p className="text-[14px] text-fg-2">Alle Meilensteine sind erledigt.</p>
      </section>
    );
  }

  const children = milestones.filter((m) => m.parent_id === next.id).sort((a, b) => a.sort - b.sort);
  const done = children.filter((m) => m.status === "erledigt").length;
  const allDone = children.length > 0 && done === children.length;

  return (
    <section className={cn(card, "flex min-w-0 flex-[1_1_320px] flex-col gap-3.5 px-5 py-[18px] md:px-6 md:py-[22px]")}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="label-mono">Nächster Meilenstein</h2>
        <DueChip due={next.due_date} today={today} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Link href={`/roadmap?m=${next.id}`} className="rounded-md text-[16.5px] leading-[1.35] font-semibold tracking-[-0.01em] hover:underline hover:decoration-line-2 hover:underline-offset-4">
          <span className="font-mono text-[13px] font-medium text-fg-3">{next.id} </span>
          {next.title}
        </Link>
        <p className="text-[13px] text-fg-2">{formatHeaderDate(next.due_date)}</p>
      </div>

      {children.length > 0 && <MilestoneChecklist items={children} onToggle={onToggle} />}

      {children.length > 0 && (
        <div className="flex items-center gap-2.5 text-[12.5px] text-fg-3 tabular">
          <div className="h-[3px] flex-1 overflow-hidden rounded-sm bg-line-2">
            <div className="h-full rounded-sm bg-acc-line transition-[width] duration-300 ease-out" style={{ width: `${(done / children.length) * 100}%` }} />
          </div>
          {done} von {children.length} erledigt
        </div>
      )}

      {allDone && (
        <button
          type="button"
          onClick={() => onToggle(next.id, true)}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-[9px] bg-acc px-3 text-[13px] font-medium text-acc-text transition-[scale] duration-150 active:scale-[.97]"
        >
          <Check className="size-4" strokeWidth={2.4} aria-hidden />
          {next.id} abschließen
        </button>
      )}
    </section>
  );
}

// ---------------------------------------------------------------
// Zielzahlen
// ---------------------------------------------------------------
function GoalTiles({ orgs, milestones }: { orgs: Org[]; milestones: Milestone[] }) {
  const won = (role: Org["roles"][number], stages: Org["stage"][] = ["zugesagt", "fix"]) =>
    orgs.filter((o) => o.roles.includes(role) && stages.includes(o.stage)).length;
  const due = (id: string) => {
    const m = milestones.find((x) => x.id === id);
    return m ? formatShort(m.due_date) : "";
  };

  const goals = [
    { label: "Track-Partner zugesagt", value: won("challenge"), target: 4, note: `bis ${due("M3")}` },
    { label: "Jury zugesagt", value: won("jury"), target: 4, note: `bis ${due("M4")}` },
    { label: "Venue fixiert", value: won("venue", ["fix"]), target: 1, note: `plus Backup · bis ${due("M2")}` },
    { label: "Sponsoren zugesagt", value: won("sponsor") + won("tokens"), target: null, note: "Credits und Verpflegung" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-[repeat(auto-fit,minmax(200px,1fr))] md:gap-4">
      {goals.map((g) => (
        <Link
          key={g.label}
          href="/pipeline"
          className={cn(card, "flex flex-col gap-3 px-4 py-3.5 transition-shadow duration-150 hover:shadow-[0_0_0_1px_var(--line2)] md:px-5 md:py-[18px]")}
        >
          <span className="text-[13px] text-fg-2">{g.label}</span>
          <span className="flex items-baseline gap-1.5">
            <span className="text-[28px] leading-none font-medium tracking-[-0.04em] tabular md:text-[34px]">{g.value}</span>
            <span className="text-[14px] text-fg-3 tabular md:text-[15px]">{g.target ? `/ ${g.target}` : "Ziel offen"}</span>
          </span>
          <span className="flex gap-1" aria-hidden>
            {Array.from({ length: g.target ?? 1 }, (_, i) => (
              <span key={i} className={cn("h-1 flex-1 rounded-sm", i < g.value ? "bg-acc-line" : "bg-line-2")} />
            ))}
          </span>
          <span className="text-[12px] text-fg-3">{g.note}</span>
        </Link>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------
// Als Nächstes fällig (Meilensteine und Aufgaben, nach Tag gruppiert)
// ---------------------------------------------------------------
type DueItem = { key: string; kind: "milestone" | "task"; id?: string; title: string; due: string; areaId: string | null; ownerId: string | null };

function DueCard({ milestones, tasks, today }: { milestones: Milestone[]; tasks: Task[]; today: string }) {
  const { areaById, personById } = useTeam();
  const parentsWithChildren = new Set(milestones.map((m) => m.parent_id).filter(Boolean));
  const areaOwner = (id: string | null) => areaById(id)?.owner_id ?? null;

  const items: DueItem[] = [
    ...milestones
      .filter((m) => m.status !== "erledigt" && !parentsWithChildren.has(m.id))
      .map((m) => ({ key: m.id, kind: "milestone" as const, id: m.id, title: m.title, due: m.due_date, areaId: m.area_id, ownerId: areaOwner(m.area_id) })),
    ...tasks.map((t) => ({ key: t.id, kind: "task" as const, title: t.title, due: t.due_date!, areaId: t.area_id, ownerId: t.assignee_id })),
  ].sort((a, b) => a.due.localeCompare(b.due));

  // Überfälliges zuerst, dann die nächsten 3 Tage mit Einträgen.
  const overdue = items.filter((i) => i.due < today);
  const days = [...new Set(items.filter((i) => i.due >= today).map((i) => i.due))].slice(0, 3);
  const groups = [
    ...(overdue.length ? [{ label: "Überfällig", red: true, items: overdue }] : []),
    ...days.map((d) => ({ label: `${formatShort(d)} · ${relativeDays(d, today)}`, red: false, items: items.filter((i) => i.due === d) })),
  ];

  return (
    <section className={cn(card, "min-w-0 flex-[1.45_1_440px] overflow-hidden")}>
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <h2 className="text-[14px] font-semibold">Als Nächstes fällig</h2>
        <Link href="/aufgaben" className="rounded-md text-[12.5px] text-fg-2 hover:text-fg">
          Alle Aufgaben
        </Link>
      </div>
      {groups.length === 0 && <p className="border-t border-line px-4 py-6 text-[13.5px] text-fg-2">Nichts fällig.</p>}
      {groups.map((g) => (
        <div key={g.label}>
          <h3 className={cn("label-mono border-t border-line bg-card-2 px-4 pt-2.5 pb-2", g.red && "text-st-red!")}>{g.label}</h3>
          <ul>
            {g.items.map((it) => {
              const area = areaById(it.areaId);
              return (
                <li key={it.key} className="relative flex min-h-10 items-center gap-3 border-t border-line px-4 text-[13.5px] has-[a]:hover:bg-hover">
                  {it.kind === "milestone" ? (
                    <svg viewBox="0 0 24 24" className="size-[13px] shrink-0 text-fg-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-label="Meilenstein">
                      <path d="M12 3 21 12 12 21 3 12z" />
                    </svg>
                  ) : (
                    <span className="size-[13px] shrink-0 rounded-full border-[1.5px] border-line-2" aria-label="Aufgabe" />
                  )}
                  {it.id && <span className="w-[34px] shrink-0 font-mono text-[12px] text-fg-3">{it.id}</span>}
                  {it.kind === "milestone" ? (
                    <Link href={`/roadmap?m=${it.id}`} className="min-w-0 flex-1 truncate rounded-sm after:absolute after:inset-0">
                      {it.title}
                    </Link>
                  ) : (
                    <Link href={`/aufgaben?aufgabe=${it.key}`} className="min-w-0 flex-1 truncate rounded-sm after:absolute after:inset-0">
                      {it.title}
                    </Link>
                  )}
                  {area && (
                    <span className="hidden items-center gap-1.5 text-[12.5px] whitespace-nowrap text-fg-2 sm:inline-flex">
                      <span className="size-[7px] rounded-full" style={{ background: area.color }} aria-hidden />
                      {area.name}
                    </span>
                  )}
                  <Avatar person={personById(it.ownerId)} size={22} />
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}

// ---------------------------------------------------------------
// Heute nachfassen
// ---------------------------------------------------------------
function FollowUpCard({ orgs, today }: { orgs: Org[]; today: string }) {
  const { personById } = useTeam();
  const due = orgs
    .filter((o) => o.next_follow_up && o.next_follow_up <= today && o.stage !== "fix" && o.stage !== "abgesagt")
    .sort((a, b) => a.next_follow_up!.localeCompare(b.next_follow_up!));

  return (
    <section className={cn(card, "flex min-w-0 flex-[1_1_320px] flex-col gap-3.5 p-4")}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[14px] font-semibold">Heute nachfassen</h2>
        {due.length > 0 && <span className="text-[12.5px] text-fg-3 tabular">{due.length} offen</span>}
      </div>

      {due.length > 0 ? (
        <ul className="flex flex-col overflow-hidden rounded-[10px] shadow-[0_0_0_1px_var(--line)]">
          {due.map((o) => {
            const late = o.next_follow_up! < today;
            return (
              <li key={o.id} className="relative flex min-h-11 items-center gap-2.5 border-t border-line px-3 text-[13.5px] first:border-t-0 hover:bg-hover md:min-h-10">
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-active text-[10px] font-semibold text-fg-2" aria-hidden>
                  {o.name.slice(0, 2).toUpperCase()}
                </span>
                <Link href={`/pipeline?firma=${o.id}`} className="min-w-0 flex-1 truncate rounded-sm after:absolute after:inset-0">
                  {o.name}
                </Link>
                <Chip tone={late ? "red" : "today"}>
                  {late ? "überfällig" : "heute"}
                </Chip>
                <Avatar person={personById(o.owner_id)} size={22} />
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2.5 rounded-[10px] bg-card-2 px-3 py-5 text-center">
          <div className="grid size-10 place-items-center rounded-xl text-fg-2 shadow-[inset_0_0_0_1px_var(--line2)]">
            <Send className="size-[18px]" strokeWidth={1.8} aria-hidden />
          </div>
          <p className="text-[14px] font-medium">Noch nichts nachzufassen</p>
          {today < WAVE_1 && <p className="text-[13px] text-fg-2">Welle 1 startet am {formatShort(WAVE_1)}</p>}
          <Link
            href="/pipeline"
            className="mt-1 inline-flex h-8 items-center rounded-[9px] px-3 text-[13px] font-medium text-fg-2 shadow-[inset_0_0_0_1px_var(--line2)] transition-colors duration-150 hover:bg-hover hover:text-fg"
          >
            Pipeline öffnen
          </Link>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-fg-3">
        Nachfass-Runden
        {FOLLOW_UP_ROUNDS.map((d) => (
          <Chip key={d} className={cn(d < today && "line-through opacity-60")}>
            {formatDayMonth(d)}
          </Chip>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------
// Bereiche mit Verantwortlichen
// ---------------------------------------------------------------
function AreasSection({ milestones, today }: { milestones: Milestone[]; today: string }) {
  const { areas, personById } = useTeam();
  const [dialog, setDialog] = useState(false);
  const open = areas.filter((a) => !a.owner_id).length;

  return (
    <section className="flex flex-col gap-3 pt-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[14px] font-semibold">Bereiche</h2>
          {open > 0 && (
            <Chip tone="amber">
              {open} ohne Verantwortliche
            </Chip>
          )}
        </div>
        <button
          type="button"
          onClick={() => setDialog(true)}
          className="inline-flex h-8 items-center rounded-[9px] px-3 text-[13px] font-medium text-fg-2 shadow-[inset_0_0_0_1px_var(--line2)] transition-[background,color,scale] duration-150 hover:bg-hover hover:text-fg active:scale-[.97]"
        >
          Zuständigkeiten verteilen
        </button>
      </div>

      {/* Breit genug: alle Bereiche in einer Zeile (Spaltenzahl folgt der Zahl der Bereiche), sonst 2–4 Spalten */}
      <div className="@container">
        <div className="grid grid-cols-2 gap-2 @lg:grid-cols-3 @2xl:grid-cols-4 @4xl:grid-flow-col @4xl:grid-cols-none @4xl:auto-cols-fr">
          {areas.map((a) => {
            const own = milestones.filter((m) => m.area_id === a.id);
            const done = own.filter((m) => m.status === "erledigt").length;
            const next = own.find((m) => m.status !== "erledigt" && m.due_date >= today);
            const owner = personById(a.owner_id);
            return (
              <Link
                key={a.id}
                href={`/bereiche/${a.id}`}
                aria-label={`${a.name}: ${owner ? owner.name : "Verantwortlich offen"}, ${done} von ${own.length} Meilensteinen erledigt${next ? `, nächster ${formatDayMonth(next.due_date)}` : ""}`}
                className={cn(card, "group flex min-w-0 flex-col gap-2 px-3 py-2.5 transition-shadow duration-150 hover:shadow-[0_0_0_1px_var(--line2)]")}
              >
                <span className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium">
                  <AreaGlyph color={a.color} progress={own.length ? done / own.length : 0} size={13} />
                  <span className="truncate">{a.name}</span>
                </span>
                <span className="flex min-w-0 items-center gap-1.5">
                  <Avatar person={owner} size={18} />
                  {owner ? (
                    <span className="truncate text-[12px] text-fg-2">{owner.name}</span>
                  ) : (
                    <span className="truncate text-[12px] text-st-amber">offen</span>
                  )}
                </span>
                <span className="truncate font-mono text-[11px] text-fg-3 tabular">
                  {done}/{own.length}
                  {next ? ` · ${formatDayMonth(next.due_date)}` : own.length ? " · fertig" : ""}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <OwnersDialog open={dialog} onOpenChange={setDialog} />
    </section>
  );
}

// ---------------------------------------------------------------
// Ladezustand: Flächen in der Form der fertigen Seite, damit nichts springt
// ---------------------------------------------------------------
function OverviewSkeleton() {
  const block = "rounded-[14px] bg-card-2";
  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-4 px-3.5 pt-2 pb-8 md:gap-5 md:px-8 md:pt-8" aria-busy="true" aria-label="Übersicht lädt">
      <div className="flex flex-col gap-2 pb-1.5">
        <div className="h-7 w-56 rounded-md bg-card-2" />
        <div className="h-4 w-72 rounded-md bg-card-2" />
      </div>
      <div className="flex flex-wrap gap-4">
        <div className={cn(block, "h-[214px] min-w-0 flex-[1.45_1_440px]")} />
        <div className={cn(block, "h-[214px] min-w-0 flex-[1_1_320px]")} />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={cn(block, "h-[124px]")} />
        ))}
      </div>
    </div>
  );
}
