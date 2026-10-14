"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/avatar";
import { PageHeader } from "@/components/app-shell/page-header";
import { useTeam } from "@/components/app-shell/team-provider";
import { useToday } from "@/lib/use-today";
import { useMilestones, type Milestone } from "@/lib/data/use-milestones";
import { daysBetween, formatDayMonth } from "@/lib/dates";
import { FOLLOW_UP_ROUNDS } from "@/lib/phases";
import { AXIS_DAYS, axisEdge, axisPos, MONTHS, PLAN_BARS } from "@/lib/roadmap";
import { Segmented } from "@/components/segmented";
import { MilestoneDetail } from "./milestone-detail";

// Roadmap (Board „Graphit-Roadmap“): Zeitstrahl je Bereich mit Rauten und Balken, darunter das
// Detail-Panel. Umschalter Zeitstrahl/Liste; am Handy nur die Liste. Auswahl steht in der Adresse (?m=M2).

type View = "timeline" | "list";

export function Roadmap() {
  const today = useToday();
  const { milestones, setMilestoneDone } = useMilestones();
  const [view, setView] = useState<View>("timeline");
  const [picked, setPicked] = useState<string | null>(null);

  // Direktlink ?m=M2.1 (z. B. aus der Übersicht oder per WhatsApp): einmal beim Öffnen lesen.
  useEffect(() => {
    const m = new URLSearchParams(window.location.search).get("m");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Adresse ist erst im Browser bekannt
    if (m) setPicked(m);
  }, []);

  const select = (id: string) => {
    setPicked(id);
    window.history.replaceState(null, "", `?m=${id}`);
  };

  const byId = (id: string | null) => milestones?.find((m) => m.id === id) ?? null;
  const childrenOf = (id: string) => (milestones ?? []).filter((m) => m.parent_id === id).sort((a, b) => a.sort - b.sort);
  const tops = (milestones ?? []).filter((m) => !m.parent_id);
  const selected = byId(picked) ?? tops.find((m) => m.status !== "erledigt") ?? tops[0] ?? null;
  // In der Liste stehen Unterpunkte in der Karte ihres Meilensteins.
  const listTarget = selected?.parent_id ?? selected?.id;

  // Nach dem Laden zum verlinkten Meilenstein scrollen (Liste am Handy).
  const ready = Boolean(milestones && today);
  useEffect(() => {
    if (!ready || !picked) return;
    const target = byId(picked);
    const el = document.getElementById(`ms-${target?.parent_id ?? picked}`);
    if (el && el.offsetParent !== null) el.scrollIntoView({ block: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur beim ersten fertigen Laden
  }, [ready]);

  return (
    <>
      <PageHeader title="Roadmap">
        <Segmented
          label="Ansicht"
          value={view}
          onChange={setView}
          options={[
            { value: "timeline", label: "Zeitstrahl" },
            { value: "list", label: "Liste" },
          ]}
        />
      </PageHeader>
      <h1 className="px-3.5 pt-2 pb-3 text-[21px] font-semibold tracking-[-0.025em] md:sr-only">Roadmap</h1>

      {!milestones || !today ? (
        <div className="mx-3.5 h-[420px] rounded-xl bg-card-2 md:mx-5 md:mt-5" aria-busy="true" aria-label="Roadmap lädt" />
      ) : (
        <>
          {view === "timeline" && (
            <div className="hidden pt-1.5 pb-6 md:block">
              <Timeline milestones={milestones} today={today} selectedId={selected?.id ?? null} onSelect={select} />
              {selected && (
                <div className="px-5 pt-4">
                  <MilestoneDetail
                    milestone={selected}
                    subs={childrenOf(selected.id)}
                    parent={byId(selected.parent_id)}
                    today={today}
                    onToggle={setMilestoneDone}
                    onSelect={select}
                    feed="open"
                  />
                </div>
              )}
            </div>
          )}
          <div className={cn("flex flex-col gap-3 px-3.5 pb-8 md:gap-4 md:px-5 md:pt-5", view === "timeline" && "md:hidden")}>
            <MilestoneList
              tops={tops}
              childrenOf={childrenOf}
              today={today}
              onToggle={setMilestoneDone}
              highlightId={picked ? listTarget : null}
            />
          </div>
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------
// Zeitstrahl
// ---------------------------------------------------------------
type Placed = Milestone & { x: number; place: "up" | "down"; anchorRight: boolean };

/** Beschriftungen in einer Zeile abwechselnd oben/unten, wenn Rauten eng beieinander liegen. */
function placeLabels(items: Milestone[]): Placed[] {
  const out: Placed[] = [];
  for (const m of items) {
    const x = axisPos(m.due_date);
    const prev = out[out.length - 1];
    const place = prev && x - prev.x < 9 ? (prev.place === "up" ? "down" : "up") : "up";
    out.push({ ...m, x, place, anchorRight: x > 88 });
  }
  return out;
}

function Timeline({
  milestones,
  today,
  selectedId,
  onSelect,
}: {
  milestones: Milestone[];
  today: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { allAreas, personById } = useTeam();
  const parentDue = (m: Milestone) => milestones.find((p) => p.id === m.parent_id)?.due_date;
  // Unterpunkte bis 3 Tage vor ihrem Meilenstein (M1.1–M1.4, M8.1) würden dessen Raute verdecken: nur im Detail zeigen.
  const visible = milestones.filter((m) => {
    const due = parentDue(m);
    return !m.parent_id || !due || daysBetween(m.due_date, due) > 3;
  });
  const todayOnAxis = daysBetween(MONTHS[0].start, today) >= 0 && daysBetween(today, "2027-02-28") >= 0;

  return (
    <div className="mx-5 mt-3.5 overflow-x-auto rounded-xl shadow-[0_0_0_1px_var(--line)]">
      <div className="grid min-w-[980px] grid-cols-[196px_minmax(0,1fr)]">
        {/* Bereiche */}
        <div className="border-r border-line">
          <div className="label-mono flex h-10 items-center px-3.5">Bereich</div>
          {allAreas.map((a) => {
            const owner = personById(a.owner_id);
            return (
              <div key={a.id} className="flex h-[58px] items-center gap-2.5 border-t border-line px-3.5">
                <span className="size-2 shrink-0 rounded-full" style={{ background: a.color }} aria-hidden />
                <span className="flex-1 truncate text-[13px]">{a.name}</span>
                <Avatar person={owner} size={20} title={owner ? `Verantwortlich: ${owner.name}` : "Verantwortlich offen"} />
              </div>
            );
          })}
        </div>

        {/* Achse */}
        <div className="relative">
          <div className="flex h-10">
            {MONTHS.map((mo) => (
              <div
                key={mo.name}
                className="flex items-end border-l border-line px-2.5 pb-1.5 text-[12px] text-fg-2"
                style={{ width: `${(mo.days / AXIS_DAYS) * 100}%` }}
              >
                {mo.name}
              </div>
            ))}
          </div>

          {allAreas.map((a) => {
            const items = placeLabels(visible.filter((m) => m.area_id === a.id).sort((x, y) => x.due_date.localeCompare(y.due_date)));
            const bars = [
              ...milestones
                .filter((m) => m.area_id === a.id && m.start_date)
                .map((m) => ({ key: m.id, from: m.start_date!, to: m.due_date, label: `${m.id} · ${m.title}`, faint: false })),
              ...PLAN_BARS.filter((b) => b.areaId === a.id).map((b) => ({ ...b, key: b.label })),
            ];
            return (
              <div key={a.id} className="relative h-[58px] border-t border-line">
                {bars.map((b) => (
                  <div
                    key={b.key}
                    title={`${b.label} (${formatDayMonth(b.from)}–${formatDayMonth(b.to)})`}
                    className="absolute top-6 h-2.5 rounded-[5px]"
                    style={{
                      left: `${axisEdge(b.from)}%`,
                      width: `${axisEdge(b.to) - axisEdge(b.from) + 100 / AXIS_DAYS}%`,
                      background: `color-mix(in srgb, ${a.color} ${b.faint ? 16 : 30}%, transparent)`,
                    }}
                  />
                ))}
                {items.map((m) => {
                  const on = m.id === selectedId;
                  const done = m.status === "erledigt";
                  const late = !done && m.due_date < today;
                  const label = m.parent_id ? m.id : `${m.id} · ${formatDayMonth(m.due_date)}`;
                  return (
                    <div key={m.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(m.id)}
                        aria-pressed={on}
                        aria-label={`${m.id} ${m.title}, fällig ${formatDayMonth(m.due_date)}${done ? ", erledigt" : late ? ", überfällig" : ""}`}
                        className={cn(
                          "absolute top-[22px] -ml-[7px] size-3.5 rotate-45 rounded-[3px] transition-[scale] duration-150 ease-out hover:scale-125",
                          done && !on && "opacity-40"
                        )}
                        style={{
                          left: `${m.x}%`,
                          background: on ? "var(--text)" : a.color,
                          boxShadow: on ? `0 0 0 3px var(--panel), 0 0 0 5px ${a.color}` : "0 0 0 3px var(--panel)",
                        }}
                      />
                      <span
                        aria-hidden
                        className={cn(
                          "pointer-events-none absolute text-[11.5px] font-medium whitespace-nowrap",
                          m.place === "up" ? "top-1" : "top-10",
                          m.anchorRight ? "-translate-x-full pr-3" : "-translate-x-1/2",
                          on ? "text-fg" : late ? "text-st-red" : "text-fg-2",
                          done && "text-fg-3 line-through"
                        )}
                        style={{ left: `${m.x}%` }}
                      >
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Gitter, Nachfass-Runden, Heute */}
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            {MONTHS.slice(1).map((mo) => (
              <div key={mo.name} className="absolute top-10 bottom-0 border-l border-line" style={{ left: `${axisEdge(mo.start)}%` }} />
            ))}
            {FOLLOW_UP_ROUNDS.map((d) => (
              <div key={d}>
                <div className="absolute top-10 bottom-0 border-l-[1.5px] border-dashed border-fg-3 opacity-55" style={{ left: `${axisPos(d)}%` }} />
                <div
                  className="absolute top-1 -translate-x-1/2 bg-panel px-1 font-mono text-[10.5px] whitespace-nowrap text-fg-3"
                  style={{ left: `${axisPos(d)}%` }}
                >
                  {formatDayMonth(d)}
                </div>
              </div>
            ))}
            {todayOnAxis && (
              <>
                <div className="absolute top-[30px] bottom-0 -ml-px w-0.5 bg-acc-line" style={{ left: `${axisPos(today)}%` }} />
                <div className="absolute top-5 size-2 -translate-x-1/2 rounded-full bg-acc-line" style={{ left: `${axisPos(today)}%` }} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// Liste (Handy und Umschalter „Liste“): Meilensteine nach Monat
// ---------------------------------------------------------------
function MilestoneList({
  tops,
  childrenOf,
  today,
  onToggle,
  highlightId,
}: {
  tops: Milestone[];
  childrenOf: (id: string) => Milestone[];
  today: string;
  onToggle: (id: string, done: boolean) => void;
  highlightId: string | null | undefined;
}) {
  const monthOf = (d: string) => MONTHS.find((mo) => d.slice(0, 7) === mo.start.slice(0, 7))?.name ?? d.slice(0, 7);
  const groups = [...new Set(tops.map((m) => monthOf(m.due_date)))];

  return (
    <>
      {groups.map((g) => (
        <section key={g} className="flex flex-col gap-3 md:gap-4">
          <h2 className="label-mono pt-2">{g}</h2>
          {tops
            .filter((m) => monthOf(m.due_date) === g)
            .map((m) => (
              <MilestoneDetail
                key={m.id}
                as="article"
                milestone={m}
                subs={childrenOf(m.id)}
                parent={null}
                today={today}
                onToggle={onToggle}
                highlighted={m.id === highlightId}
              />
            ))}
        </section>
      ))}
    </>
  );
}
