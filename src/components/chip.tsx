import { cn } from "@/lib/utils";
import { daysBetween, relativeDays } from "@/lib/dates";

// Chips (Maxi, 14.10.): kein Punkt mehr, stattdessen ein ruhiger Farbverlauf in der Statusfarbe (Stile in globals.css).
// „heute“ (Lime) und „überfällig“ (rot) bekommen einen durchlaufenden Lichtstreifen, damit sie auffallen;
// der Rest steht still. `still` schaltet den Streifen ab (z. B. Legende mit 0 Einträgen).
const TONES = {
  gray: "text-fg-2 shadow-[inset_0_0_0_1px_var(--line2)]",
  amber: "chip-tone chip-amber",
  red: "chip-tone chip-red chip-live",
  green: "chip-tone chip-green",
  today: "chip-today chip-live",
} as const;

export type ChipTone = keyof typeof TONES;

export function Chip({
  tone = "gray",
  still = false,
  className,
  children,
}: {
  tone?: ChipTone;
  still?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[11.5px] font-medium whitespace-nowrap tabular",
        TONES[tone],
        still && "after:hidden!",
        className
      )}
    >
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
  return <Chip tone={dueTone(due, today)}>{n < 0 ? `${-n} ${n === -1 ? "Tag" : "Tage"} überfällig` : relativeDays(due, today)}</Chip>;
}
