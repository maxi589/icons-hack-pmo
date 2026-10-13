"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/lib/tasks";

// Kreis zum Abhaken. Offen = leerer Ring, In Arbeit = halber Ring in Blau, Erledigt = grüner Kreis mit Haken.
// Tippfläche am Handy 44px (unsichtbar vergrößert), sichtbar bleibt der 18px-Kreis.
export function StatusCheck({ status, title, onToggle }: { status: TaskStatus; title: string; onToggle: () => void }) {
  const done = status === "erledigt";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-label={done ? `„${title}“ wieder öffnen` : `„${title}“ als erledigt markieren`}
      aria-pressed={done}
      className={cn(
        "relative z-[1] grid size-[18px] shrink-0 place-items-center rounded-full transition-[background,box-shadow,scale] duration-150 active:scale-90",
        "before:absolute before:-inset-[13px] before:content-[''] md:before:-inset-1.5",
        done
          ? "bg-st-green text-card"
          : status === "laeuft"
            ? "shadow-[inset_0_0_0_1.5px_var(--st-blue)] hover:bg-hover"
            : "shadow-[inset_0_0_0_1.5px_var(--field)] hover:bg-hover"
      )}
    >
      {done && <Check className="size-3" strokeWidth={3} aria-hidden />}
      {status === "laeuft" && <span className="size-2 rounded-full bg-[conic-gradient(var(--st-blue)_0_50%,transparent_50%_100%)]" aria-hidden />}
    </button>
  );
}
