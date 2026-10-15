"use client";

import { useSyncExternalStore } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { setSoundsOn, SOUNDS_EVENT, soundsOn } from "@/lib/sounds";
import { cn } from "@/lib/utils";

// Schalter „Töne“ an/aus, pro Gerät. Gleiche Optik wie der Hell/Dunkel-Umschalter (ThemeToggle).

function subscribe(onChange: () => void) {
  window.addEventListener(SOUNDS_EVENT, onChange);
  return () => window.removeEventListener(SOUNDS_EVENT, onChange);
}

/** Server kennt die Wahl nicht und liefert „an“; nach dem Hydrieren gilt das Gerät. */
export function useSoundsOn() {
  return useSyncExternalStore(subscribe, soundsOn, () => true);
}

const OPTIONS = [
  { value: true, label: "An", Icon: Volume2 },
  { value: false, label: "Aus", Icon: VolumeX },
] as const;

export function SoundToggle({ className, size = "sm" }: { className?: string; size?: "sm" | "lg" }) {
  const on = useSoundsOn();

  return (
    <div role="radiogroup" aria-label="Töne" className={cn("inline-flex gap-0.5 rounded-lg p-0.5 shadow-[0_0_0_1px_var(--line2)]", className)}>
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={label}
          type="button"
          role="radio"
          aria-checked={on === value}
          onClick={() => setSoundsOn(value)}
          data-sound="none"
          className={cn(
            size === "lg" ? "flex h-11 flex-1 items-center justify-center gap-2 rounded-md text-[15px]" : "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[13px]",
            "text-fg-3 transition-colors duration-150 hover:bg-hover hover:text-fg",
            on === value && "bg-active text-fg"
          )}
        >
          <Icon className={size === "lg" ? "size-4" : "size-3.5"} aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}
