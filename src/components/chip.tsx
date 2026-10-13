import { cn } from "@/lib/utils";
import { daysBetween, relativeDays } from "@/lib/dates";

// Chips laut Board: Status-Farbe als Text auf leichter Tönung, „heute“ als Lime-Fläche.
const TONES = {
  gray: "text-fg-2 shadow-[inset_0_0_0_1px_var(--line2)]",
  // Hell ohne Tönung: #b45309 auf getöntem Grund nur 4,3:1, auf Weiß 5,0:1 (nachgerechnet 13.10.).
  amber:
    "text-st-amber dark:bg-[color-mix(in_srgb,var(--st-amber)_11%,transparent)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--st-amber)_28%,transparent)]",
  red: "text-st-red bg-[color-mix(in_srgb,var(--st-red)_11%,transparent)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--st-red)_28%,transparent)]",
  green:
    "text-st-green bg-[color-mix(in_srgb,var(--st-green)_11%,transparent)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--st-green)_28%,transparent)]",
  today: "bg-acc text-acc-text",
} as const;

export type ChipTone = keyof typeof TONES;

export function Chip({
  tone = "gray",
  dot = false,
  className,
  children,
}: {
  tone?: ChipTone;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] shrink-0 items-center gap-1.5 rounded-full px-2 text-[11.5px] font-medium whitespace-nowrap tabular",
        TONES[tone],
        className
      )}
    >
      {dot && <i className="block size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

/** Frist als Chip: überfällig rot, heute Lime, ≤ 7 Tage amber, sonst neutral. */
export function dueTone(due: string, today: string): ChipTone {
  const n = daysBetween(today, due);
  if (n < 0) return "red";
  if (n === 0) return "today";
  return n <= 7 ? "amber" : "gray";
}

export function DueChip({ due, today }: { due: string; today: string }) {
  const n = daysBetween(today, due);
  return (
    <Chip tone={dueTone(due, today)} dot={n !== 0}>
      {n < 0 ? `${-n} Tage überfällig` : relativeDays(due, today)}
    </Chip>
  );
}
