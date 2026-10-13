"use client";

import { cn } from "@/lib/utils";

// Umschalter aus 2–5 Optionen (Board/Liste, Tabs). Als Radiogruppe für Screenreader.
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T;
  options: { value: T; label: React.ReactNode }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex gap-0.5 rounded-[9px] p-[3px] shadow-[inset_0_0_0_1px_var(--line2)]", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex h-[26px] shrink-0 items-center gap-1.5 rounded-[7px] px-2.5 text-[12.5px] whitespace-nowrap text-fg-2 transition-colors duration-150 hover:text-fg",
            value === o.value && "bg-active text-fg"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
