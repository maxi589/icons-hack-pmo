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
import { PrivateMark } from "./private-toggle";

// Wochenansicht (nur Desktop): Mo–So mit Zeitraster. Oben ganztägig Meilensteine und Nachfass-Runden (nur lesen).
// Ziehen über die Zeit legt einen Termin an (15-min-Raster), ein Klick auf eine freie Stelle ebenso (1 h).
// Termin ziehen verschiebt ihn (auch auf einen anderen Tag), unteren Rand ziehen ändert die Dauer; ein Klick öffnet das Detail.

const HOUR = 48; // px je Stunde
const SNAP = 15; // min

export type AllDay = { key: string; date: string; label: string; tag?: string; title?: string; href: string; kind: "milestone" | "round" };

type Placed = { m: Meeting; top: number; height: number; col: number; cols: number };

/** Überlappende Termine eines Tages nebeneinander legen. */
function layoutDay(list: Meeting[]): Placed[] {
  const items = list
    .map((m) => {
      const start = viennaParts(m.starts_at).minutes;
      // Für das Nebeneinander zählt die sichtbare Höhe (mind. 22px ≈ 28 min), sonst überdecken sich kurze Termine
      const end = Math.min(start + Math.max(m.duration_min, (22 / HOUR) * 60), 24 * 60);
      return { m, start, end, realEnd: Math.min(start + m.duration_min, 24 * 60) };
    })
    .sort((a, b) => a.start - b.start || b.end - a.end);
  const out: Placed[] = [];
  let cluster: ((typeof items)[number] & { col: number })[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const cols = Math.max(1, ...cluster.map((c) => c.col + 1));
    for (const c of cluster)
      out.push({ m: c.m, top: (c.start / 60) * HOUR, height: Math.max(((c.realEnd - c.start) / 60) * HOUR, 22), col: c.col, cols });
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

/** Termin verschieben bzw. Dauer ziehen; `moved` unterscheidet Ziehen von einem Klick. */
type Move = {
  m: Meeting;
  mode: "move" | "resize";
  x: number;
  y: number;
  from: { day: string; start: number; dur: number };
  day: string;
  start: number;
  dur: number;
  moved: boolean;
};

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
  onMove,
}: {
  monday: string;
  today: string;
  meetings: Meeting[];
  allDay: AllDay[];
  selected: string | null;
  onOpen: (m: Meeting) => void;
  onCreate: (d: MeetingDefaults) => void;
  onDelete: (m: Meeting) => void;
  /** Verschoben bzw. Dauer geändert (Wiener Datum, Minuten seit Mitternacht, Dauer) */
  onMove: (m: Meeting, date: string, minutes: number, duration: number) => void;
}) {
  const { areaById } = useTeam();
  const days = Array.from({ length: 7 }, (_, i) => plusDays(monday, i));
  const scroller = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ day: string; from: number; to: number; x: number } | null>(null);
  const [now, setNow] = useState(() => viennaParts(new Date()).minutes);
  const grid = useRef<HTMLDivElement>(null);
  // Zusätzlich in einer Ref, damit Loslassen den neuesten Stand kennt, auch wenn noch nicht neu gezeichnet wurde.
  const [move, setMoveState] = useState<Move | null>(null);
  const moveRef = useRef<Move | null>(null);
  const setMove = (v: Move | null) => {
    moveRef.current = v;
    setMoveState(v);
  };
  const suppressClick = useRef(false);

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
        <div ref={grid} className="relative grid grid-cols-[52px_repeat(7,minmax(0,1fr))]" style={{ height: 24 * HOUR }}>
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
            const moving = move?.moved && move.day === d ? move : null;
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
                  setDrag({ day: d, from: at, to: at + SNAP, x: e.clientX });
                }}
                onPointerMove={(e) => {
                  if (!drag || drag.day !== d) return;
                  const at = minuteAt(e) + SNAP;
                  setDrag({ ...drag, to: Math.max(drag.from + SNAP, at) });
                }}
                onPointerUp={(e) => {
                  if (!drag || drag.day !== d) return;
                  const len = drag.to - drag.from;
                  setDrag(null);
                  // Seitlich gewischt (Finger) = Wochenwechsel, kein neuer Termin
                  if (e.pointerType !== "mouse" && Math.abs(e.clientX - drag.x) > 40) return;
                  onCreate({ date: d, time: hhmm(drag.from), duration_min: len > SNAP ? len : 60 });
                }}
                onPointerCancel={() => setDrag(null)}
              >
                {placed.map(({ m, top, height, col, cols }) => {
                  const area = areaById(m.area_id);
                  const sel = m.id === selected;
                  const short = height < 40;
                  const dragged = move?.moved && move.m.id === m.id;
                  return (
                    <MeetingMenu key={m.id} meeting={m} onOpen={() => onOpen(m)} onDelete={() => onDelete(m)}>
                      <button
                        type="button"
                        onClick={() => {
                          if (suppressClick.current) {
                            suppressClick.current = false;
                            return;
                          }
                          onOpen(m);
                        }}
                        onPointerDown={(e) => {
                          if (e.button !== 0 || e.pointerType === "touch") return;
                          e.stopPropagation();
                          e.currentTarget.setPointerCapture(e.pointerId);
                          const p = viennaParts(m.starts_at);
                          const from = { day: p.date, start: p.minutes, dur: m.duration_min };
                          const mode = (e.target as HTMLElement).closest("[data-resize]") ? "resize" : "move";
                          setMove({ m, mode, x: e.clientX, y: e.clientY, from, ...from, moved: false });
                        }}
                        onPointerMove={(e) => {
                          const move = moveRef.current;
                          if (!move || move.m.id !== m.id) return;
                          const dy = e.clientY - move.y;
                          const moved = move.moved || Math.abs(dy) > 4 || Math.abs(e.clientX - move.x) > 4;
                          const delta = Math.round(((dy / HOUR) * 60) / SNAP) * SNAP;
                          if (move.mode === "resize") {
                            const dur = Math.min(24 * 60 - move.from.start, Math.max(SNAP, move.from.dur + delta));
                            setMove({ ...move, dur, moved });
                            return;
                          }
                          const rect = grid.current!.getBoundingClientRect();
                          const col = Math.min(6, Math.max(0, Math.floor((e.clientX - rect.left - 52) / ((rect.width - 52) / 7))));
                          const start = Math.min(24 * 60 - move.from.dur, Math.max(0, move.from.start + delta));
                          setMove({ ...move, day: days[col], start, moved });
                        }}
                        onPointerUp={() => {
                          const move = moveRef.current;
                          if (!move || move.m.id !== m.id) return;
                          setMove(null);
                          if (!move.moved) return;
                          suppressClick.current = true;
                          const f = move.from;
                          if (move.day !== f.day || move.start !== f.start || move.dur !== f.dur) onMove(m, move.day, move.start, move.dur);
                        }}
                        onPointerCancel={() => setMove(null)}
                        aria-current={sel ? "true" : undefined}
                        title={`${m.title} · ${timeRange(m)}`}
                        className={cn(
                          "absolute flex cursor-grab flex-col overflow-hidden rounded-[7px] border-l-[3px] px-1.5 text-left transition-shadow duration-150 active:cursor-grabbing",
                          dragged && "opacity-40",
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
                          {m.private_for && <PrivateMark className="mt-px" />}
                        </span>
                        {!short && <span className="truncate text-[11px] text-fg-2 tabular">{timeRange(m)}</span>}
                        <span data-resize className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize" aria-hidden />
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
                {moving && (
                  <div
                    className="pointer-events-none absolute inset-x-[3px] z-[2] flex flex-col overflow-hidden rounded-[7px] border border-dashed border-acc-line bg-card px-1.5 py-1 shadow-[0_8px_24px_rgba(0,0,0,.18)]"
                    style={{ top: (moving.start / 60) * HOUR + 1, height: Math.max((moving.dur / 60) * HOUR, 22) - 2 }}
                  >
                    <span className="truncate text-[12px] leading-tight font-medium">{moving.m.title}</span>
                    <span className="truncate text-[11px] text-fg-2 tabular">
                      {hhmm(moving.start)}–{hhmm(Math.min(moving.start + moving.dur, 24 * 60 - 1))}
                    </span>
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
