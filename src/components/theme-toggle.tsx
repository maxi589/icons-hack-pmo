"use client";

import { useEffect, useLayoutEffect, useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { applyTheme, readThemeChoice, type ThemeChoice } from "@/lib/theme";
import { cn } from "@/lib/utils";

const OPTIONS: { value: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "light", label: "Hell", Icon: Sun },
  { value: "dark", label: "Dunkel", Icon: Moon },
];

const EVENT = "themechange";

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

export function setTheme(choice: ThemeChoice) {
  applyTheme(choice);
  window.dispatchEvent(new Event(EVENT));
}

/** Aktuelle Wahl (System, Hell, Dunkel). Server kennt sie nicht und liefert „System“; nach dem Hydrieren gilt das Cookie. */
export function useThemeChoice() {
  return useSyncExternalStore(subscribe, readThemeChoice, () => "system" as ThemeChoice);
}

/** Einmal im App-Rahmen: hält die Klasse auf <html> aktuell, auch wenn kein Umschalter sichtbar ist. */
export function ThemeSync() {
  const choice = useThemeChoice();

  // Im Dev-Modus setzt React die Klasse auf <html> beim Remount zurück, deshalb erneut anwenden.
  useLayoutEffect(() => {
    applyTheme(readThemeChoice());
  }, []);

  // Bei „System“ dem Gerät folgen, wenn es umschaltet.
  useEffect(() => {
    if (choice !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [choice]);

  return null;
}

export function ThemeToggle({ className, size = "sm" }: { className?: string; size?: "sm" | "lg" }) {
  const choice = useThemeChoice();

  return (
    <div
      role="radiogroup"
      aria-label="Darstellung"
      className={cn("inline-flex gap-0.5 rounded-lg p-0.5 shadow-[0_0_0_1px_var(--line2)]", className)}
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={choice === value}
          aria-label={label}
          title={label}
          onClick={() => setTheme(value)}
          className={cn(
            size === "lg" ? "flex h-11 flex-1 items-center justify-center gap-2 rounded-md text-[15px]" : "grid size-7 place-items-center rounded-md",
            "text-fg-3 transition-colors duration-150 hover:bg-hover hover:text-fg",
            choice === value && "bg-active text-fg"
          )}
        >
          <Icon className={size === "lg" ? "size-4" : "size-3.5"} aria-hidden />
          {size === "lg" && label}
        </button>
      ))}
    </div>
  );
}
