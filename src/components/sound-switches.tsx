"use client";

import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSoundSettings } from "@/components/app-shell/sound-provider";

// Schalter für Sounds: Icon-Knopf in der Sidebar (wie im Board), Schalter-Zeilen im Handy-Menü.
// Fun-Modus am Desktop über die Befehlsleiste (Strg+K).

export function SoundButton({ className }: { className?: string }) {
  const { sounds, setPrefs } = useSoundSettings();
  const Icon = sounds ? Volume2 : VolumeX;
  return (
    <button
      type="button"
      onClick={() => setPrefs({ sounds: !sounds })}
      aria-pressed={sounds}
      aria-label="Sounds"
      title={sounds ? "Sounds an (Fun-Modus: Strg K)" : "Sounds aus"}
      className={className}
    >
      <Icon className="size-4" strokeWidth={1.8} aria-hidden />
    </button>
  );
}

function SwitchRow({ label, hint, on, disabled, onChange }: { label: string; hint: string; on: boolean; disabled?: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onChange}
      className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3.5 py-2 text-left transition-colors duration-150 active:bg-active disabled:opacity-50"
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[15px] text-fg">{label}</span>
        <span className="text-[13px] text-fg-3">{hint}</span>
      </span>
      <span
        aria-hidden
        className={cn(
          "flex h-6 w-10 shrink-0 items-center rounded-full p-[3px] transition-colors duration-200",
          on ? "bg-acc shadow-[inset_0_0_0_1px_var(--accLine)]" : "shadow-[inset_0_0_0_1.5px_var(--field)]"
        )}
      >
        <span className={cn("size-[18px] rounded-full transition-transform duration-200 ease-out", on ? "translate-x-4 bg-acc-text" : "bg-fg-3")} />
      </span>
    </button>
  );
}

export function SoundSettings() {
  const { sounds, fun, setPrefs } = useSoundSettings();
  return (
    <div className="flex flex-col">
      <SwitchRow label="Sounds" hint="Haken, Zusagen, Meilensteine" on={sounds} onChange={() => setPrefs({ sounds: !sounds })} />
      <SwitchRow
        label="Fun-Modus"
        hint={sounds ? "Auch Klicks und Tippen" : "Erst Sounds einschalten"}
        on={sounds && fun}
        disabled={!sounds}
        onChange={() => setPrefs({ fun: !fun })}
      />
    </div>
  );
}
