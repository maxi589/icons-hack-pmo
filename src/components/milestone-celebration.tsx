"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { play } from "@/lib/sounds";

// Wow-Moment „Meilenstein erledigt“ (Design-System, Abschnitt 1): Karte oben mittig, Haken springt auf,
// Punkte in den Bereichsfarben fliegen nach außen, dazu der Jingle. Blockiert keine Klicks.
// Auslösen von überall mit celebrateMilestone(…), gezeigt wird einmal im App-Rahmen.

type Shown = { id: string; title: string; key: number };

const EVENT = "milestone-done";
const SHOW_MS = 2600;
const LEAVE_MS = 300;

const DOT_COLORS = [
  "var(--accLine)",
  "var(--area-partner)",
  "var(--area-sponsoren)",
  "var(--area-venue)",
  "var(--area-marketing)",
  "var(--area-jury)",
];
const DOTS = Array.from({ length: 16 }, (_, i) => ({
  angle: `${i * 22.5 + (i % 2 ? 6 : -4)}deg`,
  dist: `${i % 3 === 0 ? 46 : i % 3 === 1 ? 38 : 30}px`,
  size: i % 4 === 0 ? 6 : 4.5,
  color: DOT_COLORS[i % DOT_COLORS.length],
}));

export function celebrateMilestone(m: { id: string; title: string }) {
  window.dispatchEvent(new CustomEvent<{ id: string; title: string }>(EVENT, { detail: { id: m.id, title: m.title } }));
}

export function MilestoneCelebration() {
  const [shown, setShown] = useState<Shown | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const onDone = (e: Event) => {
      const { id, title } = (e as CustomEvent<{ id: string; title: string }>).detail;
      play("milestoneDone");
      setLeaving(false);
      setShown({ id, title, key: Date.now() });
    };
    window.addEventListener(EVENT, onDone);
    return () => window.removeEventListener(EVENT, onDone);
  }, []);

  useEffect(() => {
    if (!shown) return;
    const leave = setTimeout(() => setLeaving(true), SHOW_MS);
    const hide = setTimeout(() => setShown(null), SHOW_MS + LEAVE_MS);
    return () => {
      clearTimeout(leave);
      clearTimeout(hide);
    };
  }, [shown]);

  return (
    <>
      <div aria-live="polite" className="sr-only">
        {shown && `Meilenstein ${shown.id} erledigt`}
      </div>
      {shown && (
        <div aria-hidden className="pointer-events-none fixed inset-x-0 top-[calc(64px+env(safe-area-inset-top))] z-[60] flex justify-center px-4 md:top-[14vh]">
          <div
            key={shown.key}
            data-leaving={leaving || undefined}
            className="celebrate-card flex max-w-full items-center gap-4 rounded-2xl bg-card py-4 pr-6 pl-4 shadow-[0_0_0_1px_var(--line2),0_24px_64px_rgba(0,0,0,.28)]"
          >
            <span className="relative grid size-12 shrink-0 place-items-center">
              {DOTS.map((d, i) => (
                <span
                  key={i}
                  className="celebrate-dot absolute top-1/2 left-1/2 rounded-full motion-reduce:hidden"
                  style={
                    {
                      "--angle": d.angle,
                      "--dist": d.dist,
                      width: d.size,
                      height: d.size,
                      marginLeft: -d.size / 2,
                      marginTop: -d.size / 2,
                      background: d.color,
                    } as React.CSSProperties
                  }
                />
              ))}
              <span className="celebrate-ring absolute inset-0 rounded-full border-2 border-acc-line motion-reduce:hidden" />
              <span className="celebrate-check relative grid size-12 place-items-center rounded-full bg-acc text-acc-text">
                <Check className="size-6" strokeWidth={2.6} />
              </span>
            </span>
            <span className="flex min-w-0 flex-col gap-1">
              <span className="label-mono">Meilenstein erledigt</span>
              <span className="truncate text-[15px] font-semibold tracking-[-0.01em]">
                <span className="font-mono text-[13px] font-medium text-fg-3">{shown.id} </span>
                {shown.title}
              </span>
            </span>
          </div>
        </div>
      )}
    </>
  );
}
