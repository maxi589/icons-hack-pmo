"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTeam } from "@/components/app-shell/team-provider";
import { viennaParts, timeRange, plusDays, type Meeting } from "@/lib/meetings";
import type { MeetingDefaults } from "./new-meeting-dialog";
import { MeetingMenu } from "./meeting-menu";

// Wochenansicht (nur Desktop): Mo–So mit Zeitraster. Oben ganztägig Meilensteine und Nachfass-Runden (nur lesen).
// Ziehen über die Zeit legt einen Termin an (15-min-Raster), ein Klick auf eine freie Stelle ebenso (1 h).

const HOUR = 48; // px je Stunde
const SNAP = 15; // min

export type AllDay = { key: string; date: string; label: string; href: string; kind: "milestone" | "round" };

type Placed = { m: Meeting; top: number; height: number; col: number; cols: number };

/** Überlappende Termine eines Tages nebeneinander legen. */
function layoutDay(list: Meeting[]): Placed[] {
  const items = list
    .map((m) => {
      const start = viennaParts(m.starts_at).minutes;
      return { m, start, end: Math.min(start + m.duration_min, 24 * 60) };
    })
    .sort((a, b) => a.start - b.start || b.end - a.end);
  const out: Placed[] = [];
  let cluster: ((typeof items)[number] & { col: number })[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const cols = Math.max(1, ...cluster.map((c) => c.col + 1));
    for (const c of cluster)
      out.push({ m: c.m, top: (c.start / 60) * HOUR, height: Math.max(((c.end - c.start) / 60) * HOUR, 22), col: c.col, cols });
    cluster = [];
  };
  for (const it of items) {
    if (it.start >= clusterEnd) {
      flush();
      clusterEnd = -1;
    }
    const used = new Set(cluster.filter((c) => c.end > it.start).map((c) => c.col));
    let col = 0;
    while (used.has(col)) col++;
    cluster.push({ ...it, col });
    clusterEnd = Math.max(clusterEnd, it.end);
  }
  flush();
  return out;
}

const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

export function WeekView({
  monday,
  today,
  meetings,
  allDay,
  selected,
  onOpen,
  onCreate,
  onDelete,
}: {
  monday: string;
  today: string;
  meetings: Meeting[];
  allDay: AllDay[];
  selected: string | null;
  onOpen: (m: Meeting) => void;
  onCreate: (d: MeetingDefaults) => void;
  onDelete: (m: Meeting) => void;
}) {
  const { areaById } = useTeam();
  const days = Array.from({ length: 7 }, (_, i) => plusDays(monday, i));
  const scroller = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ day: string; from: number; to: number } | null>(null);
  const [now, setNow] = useState(() => viennaParts(new Date()).minutes);

  useEffect(() => {
    const id = setInterval(() => setNow(viennaParts(new Date()).minutes), 60_000);
    return () => clearInterval(id);
  }, []);

  // Beim Wochenwechsel zum ersten Termin (spätestens 8:00) scrollen.
  const first = Math.min(
    8 * 60,
    ...meetings.filter((m) => days.includes(viennaParts(m.starts_at).date)).map((m) => viennaParts(m.starts_at).minutes)
  );
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = Math.max(0, (first / 60) * HOUR - 12);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur beim Wochenwechsel, nicht bei jeder Änderung
  }, [monday]);

  const minuteAt = (e: React.PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const raw = ((e.clientY - rect.top) / HOUR) * 60;
    return Math.min(24 * 60 - SNAP, Math.max(0, Math.floor(raw / SNAP) * SNAP));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Kopf: Tage + ganztägige Markierungen */}
      <div className="grid shrink-0 grid-cols-[52px_repeat(7,minmax(0,1fr))] overflow-y-hidden border-b border-line [scrollbar-gutter:stable]">
        <div />
        {days.map((d) => {
          const isToday = d === today;
          return (
            <div key={d} className="flex min-w-0 flex-col gap-1 border-l border-line px-1.5 pt-2 pb-1.5">
              <div className={cn("flex items-baseline gap-1.5 px-1 text-[12.5px]", isToday ? "text-fg" : "text-fg-2")}>
                <span>{format(parseISO(d), "EEEEEE", { locale: de })}</span>
                <span
                  className={cn(
                    "grid h-[22px] min-w-[22px] place-items-center rounded-full px-1 text-[13px] font-semibold tabular",
                    isToday && "bg-acc text-acc-text"
                  )}
                >
                  {format(parseISO(d), "d")}
                </span>
                {isToday && <span className="sr-only">heute</span>}
              </div>
              <div className="flex min-h-[22px] flex-col gap-0.5">
                {allDay
                  .filter((a) => a.date === d)
                  .slice(0, 2)
                  .map((a) => (
                    <Link
                      key={a.key}
                      href={a.href}
                      title={a.label}
                      className="flex h-[22px] min-w-0 items-center gap-1.5 rounded-[6px] bg-card-2 px-1.5 text-[11.5px] text-fg-2 shadow-[inset_0_0_0_1px_var(--line)] hover:text-fg"
                    >
                      {a.kind === "milestone" ? (
                        <svg
                          viewBox="0 0 24 24"
                          className="size-[10px] shrink-0"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinejoin="round"
                          aria-hidden
                        >
                          <path d="M12 3 21 12 12 21 3 12z" />
                        </svg>
                      ) : (
                        <span className="h-[10px] w-0 shrink-0 border-l-[1.5px] border-dashed border-current" aria-hidden />
                      )}
                      <span className="truncate">{a.label}</span>
                    </Link>
                  ))}
                {allDay.filter((a) => a.date === d).length > 2 && (
                  <Link href={`/roadmap`} className="px-1.5 text-[11.5px] text-fg-3 hover:text-fg">
                    +{allDay.filter((a) => a.date === d).length - 2} weitere
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Zeitraster */}
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
        <div className="relative grid grid-cols-[52px_repeat(7,minmax(0,1fr))]" style={{ height: 24 * HOUR }}>
          <div className="relative" aria-hidden>
            {Array.from({ length: 23 }, (_, i) => (
              <span key={i} className="absolute right-2 -translate-y-1/2 text-[11px] text-fg-3 tabular" style={{ top: (i + 1) * HOUR }}>
                {hhmm((i + 1) * 60)}
              </span>
            ))}
          </div>
          {days.map((d) => {
            const placed = layoutDay(meetings.filter((m) => viennaParts(m.starts_at).date === d));
            const ghost = drag?.day === d ? drag : null;
            return (
              <div
                key={d}
                role="group"
                aria-label={format(parseISO(d), "EEEE, d. MMMM", { locale: de })}
                className={cn("relative cursor-cell border-l border-line select-none", d === today && "bg-hover")}
                style={{ backgroundImage: "linear-gradient(to bottom, var(--line) 1px, transparent 1px)", backgroundSize: `100% ${HOUR}px` }}
                onPointerDown={(e) => {
                  if (e.button !== 0 || e.target !== e.currentTarget) return;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  const at = minuteAt(e);
                  setDrag({ day: d, from: at, to: at + SNAP });
                }}
                onPointerMove={(e) => {
                  if (!drag || drag.day !== d) return;
                  const at = minuteAt(e) + SNAP;
                  setDrag({ ...drag, to: Math.max(drag.from + SNAP, at) });
                }}
                onPointerUp={() => {
                  if (!drag || drag.day !== d) return;
                  const len = drag.to - drag.from;
                  setDrag(null);
                  onCreate({ date: d, time: hhmm(drag.from), duration_min: len > SNAP ? len : 60 });
                }}
                onPointerCancel={() => setDrag(null)}
              >
                {placed.map(({ m, top, height, col, cols }) => {
                  const area = areaById(m.area_id);
                  const sel = m.id === selected;
                  const short = height < 40;
                  return (
                    <MeetingMenu key={m.id} meeting={m} onOpen={() => onOpen(m)} onDelete={() => onDelete(m)}>
                      <button
                        type="button"
                        onClick={() => onOpen(m)}
                        aria-current={sel ? "true" : undefined}
                        className={cn(
                          "absolute flex flex-col overflow-hidden rounded-[7px] border-l-[3px] px-1.5 text-left transition-shadow duration-150",
                          short ? "justify-center py-0" : "py-1",
                          sel ? "shadow-[0_0_0_2px_var(--accLine)]" : "shadow-[0_0_0_1px_var(--line2)] hover:shadow-[0_0_0_1px_var(--field)]"
                        )}
                        style={{
                          top: top + 1,
                          height: height - 2,
                          left: `calc(${(col / cols) * 100}% + 3px)`,
                          width: `calc(${100 / cols}% - 6px)`,
                          borderLeftColor: area?.color ?? "var(--line2)",
                          background: area ? `color-mix(in oklab, ${area.color} 13%, var(--card))` : "var(--card2)",
                        }}
                      >
                        <span className="flex min-w-0 items-start gap-1 text-[12px] leading-tight font-medium">
                          {m.meet_url && <Video className="mt-px size-3 shrink-0 text-fg-2" aria-label="mit Meet-Link" />}
                          <span className={cn("min-w-0", short ? "truncate" : "line-clamp-2")}>{m.title}</span>
                        </span>
                        {!short && <span className="truncate text-[11px] text-fg-2 tabular">{timeRange(m)}</span>}
                      </button>
                    </MeetingMenu>
                  );
                })}
                {ghost && (
                  <div
                    className="pointer-events-none absolute inset-x-[3px] rounded-[7px] border border-dashed border-acc-line bg-hover px-1.5 py-1 text-[11px] text-fg-2 tabular"
                    style={{ top: (ghost.from / 60) * HOUR + 1, height: ((ghost.to - ghost.from) / 60) * HOUR - 2 }}
                  >
                    {hhmm(ghost.from)}–{hhmm(ghost.to)}
                  </div>
                )}
                {d === today && (
                  <div className="pointer-events-none absolute inset-x-0 z-[1] h-0.5 bg-acc-line" style={{ top: (now / 60) * HOUR }} aria-hidden>
                    <span className="absolute -top-[3px] -left-[4px] size-2 rounded-full bg-acc-line" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
