"use client";

import { useRef } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTeam } from "@/components/app-shell/team-provider";
import { formatShort, relativeDays } from "@/lib/dates";
import { plusDays, viennaParts, weekStart, type Meeting } from "@/lib/meetings";
import { MeetingRow } from "./meeting-row";
import type { AllDay } from "./week-view";

// Termine am Handy (15.10.): oben eine Wochenleiste Mo–So (klebt beim Scrollen), darunter die Woche Tag für Tag.
// Punkte unter dem Datum = Termine (Bereichsfarbe), Raute = Meilenstein oder Nachfass-Runde. Tippen auf einen Tag springt
// zu ihm, Wischen oder die Pfeile wechseln die Woche. Ganztägiges (Meilensteine, Nachfass-Runden) steht oben im Tag.
// Unter der Woche „Danach“: die nächsten Termine nach dieser Woche, damit nichts hinter dem Wochenrand verschwindet.

const diamond = (
  <svg viewBox="0 0 24 24" className="size-[11px] shrink-0" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" aria-hidden>
    <path d="M12 3 21 12 12 21 3 12z" />
  </svg>
);

export function MobileWeek({
  monday,
  today,
  meetings,
  allDay,
  selected,
  mine,
  onMine,
  onWeek,
  onOpen,
  onDelete,
}: {
  monday: string;
  today: string;
  meetings: Meeting[];
  allDay: AllDay[];
  selected: string | null;
  mine: boolean;
  onMine: () => void;
  onWeek: (monday: string | null) => void;
  onOpen: (m: Meeting) => void;
  onDelete: (m: Meeting) => void;
}) {
  const { areaById } = useTeam();
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const days = Array.from({ length: 7 }, (_, i) => plusDays(monday, i));
  const sunday = days[6];
  const thisWeek = weekStart(today) === monday;
  const dayOf = (m: Meeting) => viennaParts(m.starts_at).date;
  const onDay = (d: string) => meetings.filter((m) => dayOf(m) === d);
  const marksOn = (d: string) => allDay.filter((a) => a.date === d);
  // Nach dieser Woche: die nächsten 5 kommenden Termine (nur, wenn die Woche nicht in der Vergangenheit liegt)
  const later = sunday >= today ? meetings.filter((m) => dayOf(m) > sunday).slice(0, 5) : [];
  const month = format(parseISO(days[3]), "LLLL yyyy", { locale: de });

  // Tage zu Blöcken: Tage mit Einträgen einzeln, freie Tage hintereinander in einer Zeile („Fr, 16.10. – Sa, 17.10. frei“).
  // Vergangene freie Tage fallen weg, heute steht immer für sich.
  const blocks: { days: string[]; empty: boolean }[] = [];
  for (const d of days) {
    const empty = onDay(d).length === 0 && marksOn(d).length === 0;
    if (empty && d < today) continue;
    const last = blocks[blocks.length - 1];
    if (empty && last?.empty && d !== today && !last.days.includes(today)) last.days.push(d);
    else blocks.push({ days: [d], empty });
  }

  const jump = (d: string) => {
    const el = document.querySelector(`[data-tage~="${d}"]`);
    if (!el) return window.scrollTo({ top: 0, behavior: "smooth" });
    // Unter der klebenden Wochenleiste landen
    const bar = document.getElementById("wochenleiste")?.getBoundingClientRect().height ?? 0;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - bar - 8, behavior: "smooth" });
  };

  return (
    <div className="flex flex-col pb-8">
      {/* Wochenleiste */}
      <div
        id="wochenleiste"
        className="sticky top-0 z-10 bg-bg px-3.5 pt-1 pb-2 shadow-[0_1px_0_var(--line)]"
        onTouchStart={(e) => (swipe.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={(e) => {
          const s = swipe.current;
          swipe.current = null;
          if (!s) return;
          const dx = e.changedTouches[0].clientX - s.x;
          const dy = e.changedTouches[0].clientY - s.y;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) onWeek(plusDays(monday, dx < 0 ? 7 : -7));
        }}
      >
        <div className="flex items-center gap-1">
          <h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold capitalize" aria-live="polite">
            {month}
          </h2>
          <button
            type="button"
            aria-pressed={mine}
            onClick={onMine}
            className={cn(
              // Pille 36px hoch, Tippfläche per ::after auf 44px erweitert
              "relative mr-1 inline-flex h-9 items-center rounded-full px-3 text-[13px] shadow-[inset_0_0_0_1px_var(--line2)] transition-colors duration-150 after:absolute after:inset-x-0 after:-inset-y-1",
              mine ? "bg-active font-medium text-fg" : "text-fg-2"
            )}
          >
            Nur meine
          </button>
          {!thisWeek && (
            <button type="button" onClick={() => onWeek(null)} className="inline-flex h-11 items-center rounded-full px-3 text-[13px] font-medium text-acc-line">
              Heute
            </button>
          )}
          <button type="button" onClick={() => onWeek(plusDays(monday, -7))} className="grid size-11 place-items-center rounded-full text-fg-2 active:bg-active" aria-label="Vorige Woche">
            <ChevronLeft className="size-[18px]" aria-hidden />
          </button>
          <button type="button" onClick={() => onWeek(plusDays(monday, 7))} className="-mr-2 grid size-11 place-items-center rounded-full text-fg-2 active:bg-active" aria-label="Nächste Woche">
            <ChevronRight className="size-[18px]" aria-hidden />
          </button>
        </div>

        <ol className="mt-1 grid grid-cols-7" aria-label="Tage dieser Woche">
          {days.map((d) => {
            const list = onDay(d);
            const marks = marksOn(d);
            const isToday = d === today;
            const past = d < today;
            const label = `${formatShort(d)}${isToday ? ", heute" : ""}: ${list.length ? `${list.length} ${list.length === 1 ? "Termin" : "Termine"}` : "keine Termine"}${marks.length ? `, ${marks.length} ganztägig` : ""}`;
            return (
              <li key={d}>
                <button
                  type="button"
                  onClick={() => jump(d)}
                  aria-label={label}
                  aria-current={isToday ? "date" : undefined}
                  className="flex w-full flex-col items-center gap-1 rounded-xl pt-1 pb-1.5 active:bg-active"
                >
                  <span className={cn("text-[11px] font-medium uppercase", isToday ? "text-acc-line" : "text-fg-3")} aria-hidden>
                    {format(parseISO(d), "EEEEEE", { locale: de })}
                  </span>
                  <span
                    className={cn(
                      "grid size-8 place-items-center rounded-full text-[15px] font-semibold tabular",
                      isToday ? "bg-acc text-acc-text" : past ? "text-fg-3" : "text-fg"
                    )}
                    aria-hidden
                  >
                    {format(parseISO(d), "d")}
                  </span>
                  <span className="flex h-[7px] items-center gap-[3px]" aria-hidden>
                    {list.slice(0, 3).map((m) => (
                      <span key={m.id} className="size-[5px] rounded-full bg-fg-3" style={areaById(m.area_id) ? { background: areaById(m.area_id)!.color } : undefined} />
                    ))}
                    {marks.length > 0 && (
                      <svg viewBox="0 0 10 10" className="size-[7px] text-fg-3">
                        <path d="M5 0 10 5 5 10 0 5z" fill="currentColor" />
                      </svg>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Die Woche Tag für Tag */}
      <div className="flex flex-col gap-3.5 px-3.5 pt-3.5">
        {blocks.length === 0 && <p className="px-1 text-[13.5px] text-fg-2">Keine Termine in dieser Woche.</p>}
        {blocks.map((b) =>
          b.empty ? (
            <p key={b.days[0]} data-tage={b.days.join(" ")} className={cn("label-mono flex items-baseline gap-2 px-1", b.days[0] === today && "text-acc-line!")}>
              <span>
                {b.days.length === 1
                  ? `${formatShort(b.days[0])} · ${relativeDays(b.days[0], today)}`
                  : `${formatShort(b.days[0])} – ${formatShort(b.days[b.days.length - 1])}`}
              </span>
              <span className="font-sans text-[12.5px] tracking-normal text-fg-3 normal-case">frei</span>
            </p>
          ) : (
            <section key={b.days[0]} data-tage={b.days[0]} className="flex flex-col gap-1.5">
              <h3 className={cn("label-mono px-1", b.days[0] === today && "text-acc-line!")}>
                {formatShort(b.days[0])} · {relativeDays(b.days[0], today)}
              </h3>
              <ul className={cn("overflow-hidden rounded-xl bg-card shadow-card", b.days[0] < today && "opacity-75")}>
                {marksOn(b.days[0]).map((a) => (
                  <li key={a.key} className="relative flex min-h-11 items-center gap-2 border-t border-line px-3.5 text-[14px] text-fg-2 first:border-t-0">
                    <span className="flex shrink-0 items-center gap-1.5 font-mono text-[12px] text-fg-3">
                      {a.kind === "milestone" ? diamond : <span className="h-[12px] w-0 border-l-[1.5px] border-dashed border-current" aria-hidden />}
                      {a.tag}
                    </span>
                    <Link href={a.href} className="min-w-0 flex-1 truncate rounded-sm after:absolute after:inset-0">
                      {a.title ?? a.label}
                    </Link>
                  </li>
                ))}
                {onDay(b.days[0]).map((m) => (
                  <MeetingRow key={m.id} meeting={m} selected={m.id === selected} onOpen={() => onOpen(m)} onDelete={() => onDelete(m)} />
                ))}
              </ul>
            </section>
          )
        )}

        {later.length > 0 && (
          <section className="flex flex-col gap-1.5 pt-2" aria-label="Danach">
            <h3 className="label-mono px-1">Danach</h3>
            <ul className="overflow-hidden rounded-xl bg-card shadow-card">
              {later.map((m) => (
                <li key={m.id} className="relative flex min-h-12 items-center gap-3 border-t border-line px-3.5 first:border-t-0">
                  <span className="w-[78px] shrink-0 text-[12.5px] text-fg-2 tabular">{formatShort(dayOf(m))}</span>
                  <button type="button" onClick={() => onOpen(m)} className="min-w-0 flex-1 truncate rounded-sm text-left text-[15px] after:absolute after:inset-0">
                    {m.title}
                  </button>
                  <span className="shrink-0 text-[12.5px] text-fg-3 tabular">{viennaParts(m.starts_at).time}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
