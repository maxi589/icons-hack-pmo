"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { EVENT_START_UTC } from "@/lib/dates";

// Countdown „Live-Uhr“ (Maxi, 14.10.): Tage groß in Michroma, daneben Std : Min : Sek.
// Jede Ziffer rollt beim Wechsel wie ein Zählwerk (300 ms); die Tage rollen nur beim Öffnen hoch.
// Läuft im Browser, damit die Zeit stimmt. Reduzierte Bewegung: Ziffern springen ohne Rollen.

function useNow() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function RollDigit({ value, delay = 0, duration }: { value: number; delay?: number; duration: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(id);
  }, [value]);
  return (
    <span className="relative inline-block h-[1em] overflow-hidden align-top" aria-hidden>
      <span
        className="flex flex-col transition-transform ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none"
        style={{ transform: `translateY(-${shown}em)`, transitionDuration: `${duration}ms`, transitionDelay: `${delay}ms` }}
      >
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className="h-[1em] leading-none">
            {i}
          </span>
        ))}
      </span>
    </span>
  );
}

function Roll({ value, pad = 0, stagger = 0, duration }: { value: number; pad?: number; stagger?: number; duration: number }) {
  return (
    <span className="inline-flex">
      {String(value)
        .padStart(pad, "0")
        .split("")
        .map((c, i) => (
          <RollDigit key={i} value={Number(c)} delay={i * stagger} duration={duration} />
        ))}
    </span>
  );
}

export function Countdown({ className }: { className?: string }) {
  const now = useNow();
  if (now === null) return <div className={cn("h-[62px] md:h-[96px]", className)} aria-hidden />;

  const left = Math.max(0, Math.floor((EVENT_START_UTC - now) / 1000));
  const d = Math.floor(left / 86400);
  const h = Math.floor((left % 86400) / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;

  const unit = (v: number, label: string) => (
    <span className="flex flex-col gap-1.5 md:gap-2">
      <span className="font-display text-[20px] leading-none tabular md:text-[34px]">
        <Roll value={v} pad={2} duration={300} />
      </span>
      <span className="label-mono">{label}</span>
    </span>
  );
  const colon = <span className="pb-5 font-display text-[15px] leading-none text-fg-3 md:pb-6 md:text-[24px]">:</span>;

  // Handy (15.10.): Tage und Uhr in einer Zeile (Tage 42px, Uhr 20px); auf sehr schmalen Geräten bricht die Uhr um.
  return (
    <div className={cn("flex flex-wrap items-end gap-x-3.5 gap-y-3 md:gap-x-7", className)}>
      {/* Für Screenreader nur die Tage, keine Ansage jede Sekunde */}
      <span className="sr-only">Noch {d} Tage bis zum Hackathon</span>
      <span className="flex flex-col gap-1.5 md:gap-2" aria-hidden>
        <span className="font-display text-[42px] leading-none tracking-[0.01em] tabular md:text-[72px]">
          <Roll value={d} stagger={90} duration={700} />
        </span>
        <span className="label-mono">Tage</span>
      </span>
      <span className="flex items-end gap-2 md:gap-4" aria-hidden>
        {unit(h, "Std")}
        {colon}
        {unit(m, "Min")}
        {colon}
        {unit(s, "Sek")}
      </span>
    </div>
  );
}
