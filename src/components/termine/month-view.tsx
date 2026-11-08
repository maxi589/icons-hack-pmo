"use client";

import { addMonths, endOfMonth, format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTeam } from "@/components/app-shell/team-provider";
import { plusDays, viennaParts, weekStart, type Meeting } from "@/lib/meetings";
import { SwipeArea } from "./swipe-area";
import type { AllDay } from "./week-view";

// Monatsansicht (8.11.): Mo–So, alle Wochen des Monats. Senkrecht wischen (Finger oder Trackpad) bzw. die Pfeile
// blättern Monat für Monat. Desktop: je Tag bis zu 3 Einträge mit Zeit und Titel, Klick öffnet den Termin, Klick auf
// das Datum zeigt die Woche. Handy: nur Punkte wie in der Wochenleiste, Tippen auf den Tag zeigt seine Woche.

export const monthOf = (date: string) => date.slice(0, 7);
export const monthLabel = (month: string) => format(parseISO(`${month}-01`), "LLLL yyyy", { locale: de });
export const shiftMonth = (month: string, n: number) => format(addMonths(parseISO(`${month}-01`), n), "yyyy-MM");

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MAX = 3;

const diamond = (
  <svg viewBox="0 0 10 10" className="size-[8px] shrink-0" aria-hidden>
    <path d="M5 0 10 5 5 10 0 5z" fill="currentColor" />
  </svg>
);

export function MonthView({
  month,
  today,
  meetings,
  allDay,
  selected,
  compact,
  onMonth,
  onDay,
  onOpen,
}: {
  /** „2026-11“ */
  month: string;
  today: string;
  meetings: Meeting[];
  allDay: AllDay[];
  selected: string | null;
  /** Handy: Punkte statt Titel, eigene Kopfzeile mit Pfeilen */
  compact: boolean;
  /** null = aktueller Monat */
  onMonth: (month: string | null) => void;
  /** Woche dieses Tages zeigen */
  onDay: (date: string) => void;
  onOpen: (m: Meeting) => void;
}) {
  const { areaById } = useTeam();
  const first = `${month}-01`;
  const last = format(endOfMonth(parseISO(first)), "yyyy-MM-dd");
  const start = weekStart(first);
  const weeks = Math.ceil((Math.round((parseISO(last).getTime() - parseISO(start).getTime()) / 86_400_000) + 1) / 7);
  const days = Array.from({ length: weeks * 7 }, (_, i) => plusDays(start, i));
  const dayOf = (m: Meeting) => viennaParts(m.starts_at).date;
  const thisMonth = monthOf(today) === month;

  return (
    <SwipeArea
      axis="y"
      onPrev={() => onMonth(shiftMonth(month, -1))}
      onNext={() => onMonth(shiftMonth(month, 1))}
      // Handy: senkrechtes Wischen gehört dem Monat, nicht dem Scrollen der Seite
      className={cn("flex min-h-0 flex-1 flex-col", compact && "touch-none select-none")}
    >
      {compact && (
        <div className="flex items-center gap-1 px-3.5 pt-1 pb-2">
          <h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold capitalize" aria-live="polite">
            {monthLabel(month)}
          </h2>
          {!thisMonth && (
            <button type="button" onClick={() => onMonth(null)} className="inline-flex h-11 items-center rounded-full px-3 text-[13px] font-medium text-acc-line">
              Heute
            </button>
          )}
          <button type="button" onClick={() => onMonth(shiftMonth(month, -1))} className="grid size-11 place-items-center rounded-full text-fg-2 active:bg-active" aria-label="Voriger Monat">
            <ChevronLeft className="size-[18px]" aria-hidden />
          </button>
          <button type="button" onClick={() => onMonth(shiftMonth(month, 1))} className="-mr-2 grid size-11 place-items-center rounded-full text-fg-2 active:bg-active" aria-label="Nächster Monat">
            <ChevronRight className="size-[18px]" aria-hidden />
          </button>
        </div>
      )}

      <div className={cn("grid shrink-0 grid-cols-7 border-b border-line", compact && "px-2")} aria-hidden>
        {WEEKDAYS.map((w) => (
          <span key={w} className="py-1.5 text-center text-[11px] font-medium text-fg-3 uppercase">
            {w}
          </span>
        ))}
      </div>

      <ol
        aria-label={`Tage im ${monthLabel(month)}`}
        className={cn("grid min-h-0 flex-1 grid-cols-7", compact ? "auto-rows-[60px] px-2" : "")}
        style={compact ? undefined : { gridTemplateRows: `repeat(${weeks}, minmax(0, 1fr))` }}
      >
        {days.map((d, i) => {
          const list = meetings.filter((m) => dayOf(m) === d);
          const marks = allDay.filter((a) => a.date === d);
          const inMonth = monthOf(d) === month;
          const isToday = d === today;
          const label = `${format(parseISO(d), "EEEE, d. MMMM", { locale: de })}${isToday ? ", heute" : ""}: ${
            list.length ? `${list.length} ${list.length === 1 ? "Termin" : "Termine"}` : "keine Termine"
          }${marks.length ? `, ${marks.length} ganztägig` : ""}`;
          const number = (
            <span
              className={cn(
                "grid size-7 place-items-center rounded-full text-[13px] font-semibold tabular",
                isToday ? "bg-acc text-acc-text" : inMonth ? "text-fg" : "text-fg-3"
              )}
            >
              {format(parseISO(d), "d")}
            </span>
          );

          if (compact) {
            return (
              <li key={d} className={cn("border-t border-line", i < 7 && "border-t-0")}>
                <button
                  type="button"
                  onClick={() => onDay(d)}
                  aria-label={label}
                  aria-current={isToday ? "date" : undefined}
                  className={cn("flex size-full flex-col items-center gap-1 pt-1.5 active:bg-active", !inMonth && "opacity-50")}
                >
                  {number}
                  <span className="flex h-[7px] items-center gap-[3px]" aria-hidden>
                    {list.slice(0, 3).map((m) => (
                      <span key={m.id} className="size-[5px] rounded-full bg-fg-3" style={areaById(m.area_id) ? { background: areaById(m.area_id)!.color } : undefined} />
                    ))}
                    {marks.length > 0 && <span className="text-fg-3">{diamond}</span>}
                  </span>
                </button>
              </li>
            );
          }

          const entries = [
            ...marks.map((a) => ({ key: a.key, kind: "mark" as const, a })),
            ...list.map((m) => ({ key: m.id, kind: "meeting" as const, m })),
          ];
          const more = entries.length - MAX;
          return (
            <li
              key={d}
              className={cn(
                "flex min-h-0 min-w-0 flex-col gap-0.5 overflow-hidden border-line px-1 pt-1 pb-1",
                i % 7 !== 0 && "border-l",
                i >= 7 && "border-t",
                !inMonth && "bg-card-2/50"
              )}
            >
              <button
                type="button"
                onClick={() => onDay(d)}
                aria-label={`${label}. Woche zeigen`}
                aria-current={isToday ? "date" : undefined}
                className="self-start rounded-full hover:bg-hover"
              >
                {number}
              </button>
              {entries.slice(0, more > 0 ? MAX - 1 : MAX).map((e) =>
                e.kind === "mark" ? (
                  <Link
                    key={e.key}
                    href={e.a.href}
                    className="flex min-h-[20px] items-center gap-1 truncate rounded-[5px] px-1 text-[11.5px] text-fg-2 hover:bg-hover hover:text-fg"
                    title={e.a.label}
                  >
                    {diamond}
                    <span className="truncate">{e.a.tag ? `${e.a.tag} ${e.a.title}` : e.a.label}</span>
                  </Link>
                ) : (
                  <button
                    key={e.key}
                    type="button"
                    onClick={() => onOpen(e.m)}
                    aria-pressed={e.m.id === selected}
                    className={cn(
                      "flex min-h-[20px] w-full min-w-0 items-center gap-1 rounded-[5px] px-1 text-left text-[11.5px] hover:bg-hover",
                      e.m.id === selected && "bg-active"
                    )}
                    title={e.m.title}
                  >
                    <span
                      className="size-[6px] shrink-0 rounded-full bg-fg-3"
                      style={areaById(e.m.area_id) ? { background: areaById(e.m.area_id)!.color } : undefined}
                      aria-hidden
                    />
                    <span className="shrink-0 text-fg-3 tabular">{viennaParts(e.m.starts_at).time}</span>
                    <span className="min-w-0 truncate font-medium">{e.m.title}</span>
                  </button>
                )
              )}
              {more > 0 && (
                <button type="button" onClick={() => onDay(d)} className="self-start rounded-[5px] px-1 text-[11.5px] text-fg-3 hover:bg-hover hover:text-fg">
                  +{more + 1} weitere
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </SwipeArea>
  );
}
