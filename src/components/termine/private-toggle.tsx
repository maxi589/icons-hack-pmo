"use client";

import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

// „Nur für mich“ (17.10.): Schalter beim Anlegen und im Detail, Schloss in Listen und Woche.
// Privat = nur die eigene Person sieht den Termin, auch in Google steht er nur im eigenen Kalender.

export function PrivateToggle({ on, onChange, className }: { on: boolean; onChange: (on: boolean) => void; className?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => onChange(!on)}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] transition-colors duration-150 max-md:h-11 max-md:text-[14px]",
        on ? "bg-active font-medium text-fg shadow-[inset_0_0_0_1px_var(--line2)]" : "text-fg-2 shadow-[inset_0_0_0_1px_var(--line)] hover:bg-hover hover:text-fg",
        className
      )}
    >
      <Lock className="size-3.5" aria-hidden />
      Nur für mich
    </button>
  );
}

export function PrivateMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 text-fg-3", className)} title="Nur für dich">
      <Lock className="size-3" aria-hidden />
      <span className="sr-only">, nur für dich</span>
    </span>
  );
}
