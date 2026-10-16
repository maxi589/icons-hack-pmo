"use client";

import { useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { Check, ChevronDown, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/avatar";
import { AreaGlyph } from "@/components/area-glyph";
import { Chip, DueChip } from "@/components/chip";
import { Countdown } from "@/components/countdown";
import { RasterField } from "@/components/raster-field";
import { useTeam } from "@/components/app-shell/team-provider";
import { useNow, useToday } from "@/lib/use-today";
import { useIsMobile } from "@/lib/use-is-mobile";
import { useMeetings } from "@/lib/data/use-meetings";
import { endOf, meetingHref, viennaParts, type Meeting } from "@/lib/meetings";
import { daysBetween, EVENT_START, EVENT_START_UTC, formatDayMonth, formatHeaderDate, formatLong, formatShort, relativeDays, TIME_ZONE } from "@/lib/dates";
import { currentPhase, phaseFill, PHASES, WAVE_1 } from "@/lib/phases";
import { MilestoneChecklist } from "@/components/milestone-checklist";
import { StatusCheck } from "@/components/tasks/status-check";
import { useFollowedUp } from "@/components/pipeline/use-followed-up";
import { createClient } from "@/lib/supabase/client";
import { OwnersDialog } from "./owners-dialog";
import { TodayCard } from "./today-card";
import { useOverviewData, type Milestone, type Org, type Task } from "./use-overview-data";

// Übersicht (Board „Richtung A Graphit“): Wo stehen wir? Was ist als Nächstes dran? Wer ist zuständig?

const card = "rounded-[12px] bg-card shadow-card md:rounded-[14px]";

/** „bis Sa 27.2., 09:00“ aus Datum und Startzeit des Events */
const EVENT_UNTIL = `bis ${format(parseISO(EVENT_START), "EEEEEE d.M.", { locale: de })}, ${new Intl.DateTimeFormat("de-AT", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(EVENT_START_UTC)}`;

/** „noch 4 Tage Vorbereitung“ bzw. „letzter Tag Vorbereitung“ */
function phaseLeft(today: string, phase: number) {
  const n = daysBetween(today, PHASES[phase].end);
  if (n < 0) return PHASES[phase].name;
  return n === 0 ? `letzter Tag ${PHASES[phase].name}` : `noch ${n} ${n === 1 ? "Tag" : "Tage"} ${PHASES[phase].name}`;
}

export function Overview() {
  const today = useToday();
  const { data, setMilestoneDone } = useOverviewData();
  const { meetings } = useMeetings();

  if (!today || !data) return <OverviewSkeleton />;

  const phase = currentPhase(today);

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 px-3.5 pt-1.5 pb-6 md:gap-5 md:px-8 md:pt-8 md:pb-12">
      {/* Ohne Begrüßung (Maxi, 14.10.): eine Zeile mit Datum und Restzeit der Phase */}
      <h1 className="sr-only">Übersicht</h1>
      <p className="label-mono -mb-1 pt-1 md:pt-0">
        <span className="max-md:hidden">{formatLong(today)} · </span>
        <span className="md:hidden">{formatHeaderDate(today)} · </span>
        {phaseLeft(today, phase)}
      </p>

      <div className="flex flex-wrap gap-3 md:gap-4">
        <CountdownCard today={today} phase={phase} />
        <TodayCard tasks={data.tasks} orgs={data.orgs} meetings={meetings || []} today={today} />
        <NextMilestoneCard milestones={data.milestones} today={today} onToggle={setMilestoneDone} />
      </div>

      <GoalTiles orgs={data.orgs} milestones={data.milestones} />

      <div className="flex flex-wrap gap-3 md:gap-4">
        <DueCard milestones={data.milestones} tasks={data.tasks} orgs={data.orgs} meetings={meetings || []} today={today} />
        {/* Handy: eigene Nachfass-Fälle stehen in „Heute für dich“, das ganze Team in der Pipeline (15.10.) */}
        <div className="flex min-w-0 flex-[1_1_320px] max-md:hidden">
          <FollowUpCard orgs={data.orgs} today={today} />
        </div>
      </div>

      <AreasSection milestones={data.milestones} />
    </div>
  );
}

// ---------------------------------------------------------------
// Countdown mit Phasen-Leiste
// ---------------------------------------------------------------
function CountdownCard({ today, phase }: { today: string; phase: number }) {
  return (
    <section className={cn(card, "relative isolate flex min-w-0 flex-[1.45_1_440px] flex-col justify-between gap-[22px] overflow-hidden px-4 py-3.5 md:px-6 md:py-[22px]")}>
      <RasterField />
      {/* Handy (15.10.): nur die Uhr. Phase steht in der Zeile darüber, Label und Phasen-Balken wären Fülltext. */}
      <h2 className="label-mono max-md:sr-only">Countdown</h2>
      <Countdown />
      <p className="-mt-2 text-[13px] text-fg-2 max-md:hidden">{EVENT_UNTIL}</p>
      <ol className="grid grid-cols-5 gap-1.5 max-md:hidden" aria-label="Phasen">
        {PHASES.map((p, i) => (
          <li key={p.name} className="flex flex-col gap-2" aria-current={i === phase ? "step" : undefined}>
            <div className="h-1 overflow-hidden rounded-sm bg-line-2">
              <div className={cn("h-full rounded-sm bg-acc-line", i === phase && "bar-sheen")} style={{ width: `${Math.round(phaseFill(i, today) * 100)}%` }} />
            </div>
            <div className="hidden flex-col gap-0.5 sm:flex">
              <span className={cn("text-[12.5px] font-medium", i === phase ? "text-fg" : "text-fg-3")}>{i === phase ? <span className="phase-sweep">{p.name}</span> : p.name}</span>
              <span className={cn("text-[11.5px] text-fg-3 tabular", i !== phase && "sr-only")}>{p.label}</span>
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
  const [openSubs, setOpenSubs] = useState(false);
  const isMobile = useIsMobile();

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
    <section className={cn(card, "flex min-w-0 flex-[1_1_320px] flex-col gap-3.5 px-4 py-3.5 max-md:gap-2.5 md:px-6 md:py-[22px]")}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="label-mono">Nächster Meilenstein</h2>
        <DueChip due={next.due_date} today={today} />
      </div>
      <Link href={`/roadmap?m=${next.id}`} className="rounded-md text-[16.5px] leading-[1.35] font-semibold tracking-[-0.01em] hover:underline hover:decoration-line-2 hover:underline-offset-4 max-md:text-[15.5px]">
        <span className="font-mono text-[13px] font-medium text-fg-3">{next.id} </span>
        {next.title}
      </Link>

      {/* Handy (15.10.): Unterpunkte eingeklappt, die Zeile mit Fortschritt öffnet sie */}
      {children.length > 0 && (
        <div className={cn(!openSubs && "max-md:hidden")}>
          <MilestoneChecklist items={children} onToggle={onToggle} />
        </div>
      )}

      {children.length > 0 && (
        <button
          type="button"
          onClick={() => setOpenSubs((o) => !o)}
          aria-expanded={openSubs}
          className="-my-2 flex min-h-11 items-center gap-2.5 text-[12.5px] text-fg-3 tabular md:pointer-events-none md:my-0 md:min-h-0"
          tabIndex={isMobile ? 0 : -1}
        >
          <span className="h-[3px] flex-1 overflow-hidden rounded-sm bg-line-2">
            <span className="block h-full rounded-sm bg-acc-line transition-[width] duration-300 ease-out" style={{ width: `${(done / children.length) * 100}%` }} />
          </span>
          <span className="md:sr-only">
            {done} von {children.length}
            <span className="sr-only"> erledigt</span>
          </span>
          <ChevronDown className={cn("size-4 transition-transform duration-200 md:hidden", openSubs && "rotate-180")} aria-hidden />
        </button>
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
    { label: "Track-Partner zugesagt", short: "Track-Partner", value: won("challenge"), target: 4, note: `bis ${due("M3")}` },
    { label: "Jury zugesagt", short: "Jury", value: won("jury"), target: 4, note: `bis ${due("M4")}` },
    { label: "Venue fixiert", short: "Venue", value: won("venue", ["fix"]), target: 1, note: `plus Backup · bis ${due("M2")}` },
    { label: "Sponsoren zugesagt", short: "Sponsoren", value: won("sponsor") + won("tokens"), target: null, note: "Ziel offen" },
  ];

  return (
    <>
      {/* Handy (15.10.): eine Karte mit vier Zeilen statt vier Kacheln */}
      <Link href="/pipeline" className={cn(card, "flex flex-col md:hidden")}>
        <span className="label-mono px-4 pt-3 pb-1">Ziele</span>
        {goals.map((g) => (
          <span key={g.label} className="flex min-h-12 items-center gap-3 border-t border-line px-4 py-1.5 nth-[2]:border-t-0">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[15px] font-medium">{g.short}</span>
              {g.note && <span className="truncate text-[12.5px] text-fg-3">{g.note}</span>}
            </span>
            {g.target && (
              <span className="flex w-[84px] gap-1" aria-hidden>
                {Array.from({ length: g.target }, (_, i) => (
                  <span key={i} className={cn("h-1 flex-1 rounded-sm", i < g.value ? "bg-acc-line" : "bg-line-2")} />
                ))}
              </span>
            )}
            <span className="w-12 text-right tabular">
              <span className="text-[20px] leading-none font-medium tracking-[-0.03em]">{g.value}</span>
              {g.target && <span className="text-[13px] text-fg-3"> / {g.target}</span>}
            </span>
          </span>
        ))}
      </Link>
    <div className="hidden gap-3 md:grid md:grid-cols-[repeat(auto-fit,minmax(200px,1fr))] md:gap-4">
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
          {g.target && (
            <span className="flex gap-1" aria-hidden>
              {Array.from({ length: g.target }, (_, i) => (
                <span key={i} className={cn("h-1 flex-1 rounded-sm", i < g.value ? "bg-acc-line" : "bg-line-2")} />
              ))}
            </span>
          )}
          {g.note && g.target && <span className="text-[12px] text-fg-3">{g.note}</span>}
        </Link>
      ))}
    </div>
    </>
  );
}

// ---------------------------------------------------------------
// Als Nächstes (Termine, Meilensteine und Aufgaben, nach Tag gruppiert)
// ---------------------------------------------------------------
type DueItem = { key: string; kind: "milestone" | "task" | "meeting"; id?: string; time?: string; title: string; org?: string; due: string; areaId: string | null; ownerId: string | null; video?: boolean };

function DueCard({ milestones, tasks, orgs, meetings, today }: { milestones: Milestone[]; tasks: Task[]; orgs: Org[]; meetings: Meeting[]; today: string }) {
  const { areaById, personById, me } = useTeam();
  const now = useNow();
  const parentsWithChildren = new Set(milestones.map((m) => m.parent_id).filter(Boolean));
  const areaOwner = (id: string | null) => areaById(id)?.owner_id ?? null;
  // Unterpunkte des nächsten Meilensteins stehen schon in der Karte „Nächster Meilenstein“ (15.10.: nicht doppelt zeigen).
  // Überfällige bleiben drin, nur hier sind sie rot markiert.
  const nextTop = milestones.find((m) => !m.parent_id && m.status !== "erledigt");
  const shownAbove = (m: Milestone) => !!nextTop && m.parent_id === nextTop.id && m.due_date >= today;

  const items: DueItem[] = [
    ...milestones
      .filter((m) => m.status !== "erledigt" && !parentsWithChildren.has(m.id) && !shownAbove(m))
      .map((m) => ({ key: m.id, kind: "milestone" as const, id: m.id, title: m.title, due: m.due_date, areaId: m.area_id, ownerId: areaOwner(m.area_id) })),
    // Firma hinter dem Titel: Standard-Aufgaben heißen bei jeder Firma gleich (Maxi, 16.10.)
    ...tasks.map((t) => ({ key: t.id, kind: "task" as const, title: t.title, org: orgs.find((o) => o.id === t.organization_id)?.name, due: t.due_date!, areaId: t.area_id, ownerId: t.assignee_id })),
    // Termine: nur kommende bzw. laufende, mit Uhrzeit vor Meilensteinen und Aufgaben des Tages
    ...meetings
      .filter((m) => endOf(m).getTime() >= now)
      .map((m) => {
        const p = viennaParts(m.starts_at);
        const owner = me && m.attendees.includes(me.id) ? me.id : (m.attendees[0] ?? null);
        return { key: m.id, kind: "meeting" as const, time: p.time, title: m.title, due: p.date, areaId: m.area_id, ownerId: owner, video: !!m.meet_url };
      }),
  ];
  items.sort((a, b) => a.due.localeCompare(b.due) || (a.time ?? "99").localeCompare(b.time ?? "99"));

  // Überfälliges zuerst, dann die nächsten 3 Tage mit Einträgen.
  const overdue = items.filter((i) => i.due < today);
  const days = [...new Set(items.filter((i) => i.due >= today).map((i) => i.due))].slice(0, 3);
  const groups = [
    ...(overdue.length ? [{ label: "Überfällig", red: true, items: overdue }] : []),
    ...days.map((d) => ({ label: `${formatShort(d)} · ${relativeDays(d, today)}`, red: false, items: items.filter((i) => i.due === d) })),
  ];

  return (
    <section className={cn(card, "min-w-0 flex-[1.45_1_440px] overflow-hidden")}>
      <div className="flex items-center justify-between px-4 pt-3 pb-2.5 md:pt-4 md:pb-3">
        <h2 className="text-[14px] font-semibold">Als Nächstes</h2>
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
                <li key={it.key} className="relative flex min-h-10 items-center gap-3 border-t border-line px-4 text-[13.5px] has-[a]:hover:bg-hover max-md:min-h-11 max-md:text-[14.5px]">
                  {it.kind === "meeting" ? (
                    <Video className="size-[13px] shrink-0 text-fg-3" aria-label="Termin" />
                  ) : it.kind === "milestone" ? (
                    <svg viewBox="0 0 24 24" className="size-[13px] shrink-0 text-fg-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-label="Meilenstein">
                      <path d="M12 3 21 12 12 21 3 12z" />
                    </svg>
                  ) : (
                    <span className="size-[13px] shrink-0 rounded-full border-[1.5px] border-line-2" aria-label="Aufgabe" />
                  )}
                  {it.id && <span className="w-[34px] shrink-0 font-mono text-[12px] text-fg-3">{it.id}</span>}
                  {it.time && <span className="w-[38px] shrink-0 font-mono text-[12px] text-fg-3">{it.time}</span>}
                  {it.kind === "meeting" ? (
                    <Link href={meetingHref(it.key)} className="min-w-0 flex-1 truncate rounded-sm after:absolute after:inset-0">
                      {it.title}
                    </Link>
                  ) : it.kind === "milestone" ? (
                    <Link href={`/roadmap?m=${it.id}`} className="min-w-0 flex-1 truncate rounded-sm after:absolute after:inset-0">
                      {it.title}
                    </Link>
                  ) : (
                    <Link href={`/aufgaben?aufgabe=${it.key}`} className="min-w-0 flex-1 truncate rounded-sm after:absolute after:inset-0">
                      {it.title}
                      {it.org && <span className="text-fg-3"> · {it.org}</span>}
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
// Kreis abhaken = nachgefasst (Maxi, 15.10., wie „Heute für dich“ am Handy): nächstes Mal in 7 Tagen, Verlaufseintrag.
function FollowUpCard({ orgs, today }: { orgs: Org[]; today: string }) {
  const { personById } = useTeam();
  const followedUp = useFollowedUp();
  // Abgehakte Zeilen verschwinden sofort, solange die Live-Daten noch das alte Datum zeigen; „Rückgängig“ holt sie zurück.
  const [done, setDone] = useState<Record<string, string | null>>({});
  const save = (o: Org) => (date: string | null) => {
    setDone((d) => {
      const next = { ...d };
      if (date === o.next_follow_up) delete next[o.id];
      else next[o.id] = o.next_follow_up;
      return next;
    });
    void createClient().from("organizations").update({ next_follow_up: date }).eq("id", o.id);
  };
  const due = orgs
    .filter((o) => !(o.id in done && done[o.id] === o.next_follow_up))
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
                <StatusCheck status="offen" title={`${o.name} nachfassen`} onToggle={() => followedUp(o, today, save(o))} />
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
          <p className="text-[14px] font-medium">Noch nichts nachzufassen</p>
          {today < WAVE_1 && <p className="text-[13px] text-fg-2">Welle 1 startet am {formatShort(WAVE_1)}</p>}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------
// Bereiche mit Verantwortlichen
// ---------------------------------------------------------------
function AreasSection({ milestones }: { milestones: Milestone[] }) {
  const { areas, personById } = useTeam();
  const [dialog, setDialog] = useState(false);
  const open = areas.filter((a) => !a.owner_id).length;

  return (
    <section className="flex flex-col gap-3 pt-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <h2 className="text-[14px] font-semibold">Bereiche</h2>
        {open > 0 && (
          <button
            type="button"
            onClick={() => setDialog(true)}
            className="inline-flex h-8 items-center rounded-[9px] px-3 text-[13px] font-medium text-fg-2 shadow-[inset_0_0_0_1px_var(--line2)] transition-[background,color,scale] duration-150 hover:bg-hover hover:text-fg active:scale-[.97]"
          >
            Zuständigkeiten verteilen
          </button>
        )}
      </div>

      {/* Handy (15.10.): Liste statt Kacheln, damit lange Namen nicht abgeschnitten werden */}
      <ul className={cn(card, "overflow-hidden md:hidden")}>
        {areas.map((a) => {
          const own = milestones.filter((m) => m.area_id === a.id);
          const done = own.filter((m) => m.status === "erledigt").length;
          const next = own.find((m) => m.status !== "erledigt");
          const owner = personById(a.owner_id);
          return (
            <li key={a.id} className="relative flex min-h-12 items-center gap-3 border-t border-line px-4 first:border-t-0">
              <AreaGlyph color={a.color} progress={own.length ? done / own.length : 0} size={14} />
              <span className="flex min-w-0 flex-1 flex-col">
                <Link href={`/bereiche/${a.id}`} className="truncate rounded-sm text-[15px] font-medium after:absolute after:inset-0">
                  {a.name}
                </Link>
                <span className="truncate font-mono text-[11.5px] text-fg-3 tabular">
                  {done}/{own.length}
                  {next ? ` · ${formatDayMonth(next.due_date)}` : own.length ? " · fertig" : ""}
                </span>
              </span>
              {owner ? (
                <span className="flex shrink-0 items-center gap-1.5 text-[13px] text-fg-2">
                  <Avatar person={owner} size={22} />
                  {owner.name}
                </span>
              ) : (
                <span className="shrink-0 text-[13px] text-st-amber">Verantwortlich offen</span>
              )}
            </li>
          );
        })}
      </ul>

      {/* Breit genug: alle Bereiche in einer Zeile (Spaltenzahl folgt der Zahl der Bereiche), sonst 2–4 Spalten */}
      <div className="@container max-md:hidden">
        <div className="grid grid-cols-2 gap-2 @lg:grid-cols-3 @2xl:grid-cols-4 @4xl:grid-flow-col @4xl:grid-cols-none @4xl:auto-cols-fr">
          {areas.map((a) => {
            const own = milestones.filter((m) => m.area_id === a.id);
            const done = own.filter((m) => m.status === "erledigt").length;
            const next = own.find((m) => m.status !== "erledigt");
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
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-3.5 pt-2 pb-8 md:gap-5 md:px-8 md:pt-8" aria-busy="true" aria-label="Übersicht lädt">
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
