"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMeetings } from "@/lib/data/use-meetings";
import { useNow, useToday } from "@/lib/use-today";
import { formatShort } from "@/lib/dates";
import { endOf, meetingHref, timeRange, viennaParts, type Meeting } from "@/lib/meetings";
import { NewMeetingDialog } from "./new-meeting-dialog";
import { useMeetingActions } from "./use-meeting-actions";

// Block „Termine“ dort, wo man arbeitet (Bereichs-Seite, Firmen-Detail): kommende Termine, dazu die letzten zwei.
// „+ Termin“ legt mit vorbelegtem Bereich bzw. vorbelegter Firma an und öffnet den Termin.

const NO_TASKS = { tasks: null, update: async () => true };

export function MeetingBlock({
  match,
  area_id = null,
  organization_id = null,
  variant = "card",
}: {
  match: (m: Meeting) => boolean;
  area_id?: string | null;
  organization_id?: string | null;
  /** card = eigene Karte (Bereich), plain = Abschnitt im Detail-Panel (Firma) */
  variant?: "card" | "plain";
}) {
  const router = useRouter();
  const today = useToday();
  const now = useNow();
  const api = useMeetings();
  const actions = useMeetingActions(api, NO_TASKS, { onOpen: (m) => router.push(meetingHref(m.id)) });
  const [creating, setCreating] = useState(false);

  if (api.meetings === false || !today) return null;
  const mine = (api.meetings ?? []).filter(match);
  const upcoming = mine.filter((m) => endOf(m).getTime() >= now);
  const past = mine
    .filter((m) => endOf(m).getTime() < now)
    .slice(-2)
    .reverse();
  const list = [...upcoming, ...past];

  return (
    <section aria-label="Termine" className={cn("min-w-0", variant === "card" ? "overflow-hidden rounded-[14px] bg-card shadow-card" : "")}>
      <div className={cn("flex items-center justify-between gap-2", variant === "card" ? "px-4 pt-4 pb-3" : "pb-2")}>
        <h2 className={cn("flex items-center gap-2 font-semibold", variant === "card" ? "text-[14px]" : "text-[13px]")}>
          Termine
          {upcoming.length > 0 && <span className="font-normal text-fg-3 tabular">{upcoming.length}</span>}
        </h2>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex h-8 items-center gap-1.5 rounded-[9px] px-2.5 text-[12.5px] font-medium text-fg-2 shadow-[inset_0_0_0_1px_var(--line2)] transition-colors duration-150 hover:bg-hover hover:text-fg max-md:h-10"
        >
          <Plus className="size-3.5" aria-hidden />
          Termin
        </button>
      </div>
      {list.length === 0 ? (
        <p className={cn("text-[13px] text-fg-3", variant === "card" ? "border-t border-line px-4 py-3.5" : "")}>Keine Termine.</p>
      ) : (
        <ul className={cn(variant === "card" ? "border-t border-line" : "overflow-hidden rounded-[10px] shadow-[0_0_0_1px_var(--line)]")}>
          {list.map((m) => {
            const day = viennaParts(m.starts_at).date;
            const isPast = endOf(m).getTime() < now;
            return (
              <li
                key={m.id}
                className="relative flex min-h-11 items-center gap-2.5 border-t border-line px-3.5 first:border-t-0 hover:bg-hover max-md:min-h-12"
              >
                <span className={cn("w-[112px] shrink-0 text-[12px] tabular", isPast ? "text-fg-3" : "text-fg-2")}>
                  {day === today ? "heute" : formatShort(day)} · {timeRange(m).split("–")[0]}
                </span>
                <Link
                  href={meetingHref(m.id)}
                  className={cn(
                    "min-w-0 flex-1 truncate rounded-sm text-[13.5px] after:absolute after:inset-0 max-md:text-[15px]",
                    isPast && "text-fg-2"
                  )}
                >
                  {m.title}
                </Link>
                {m.meet_url && !isPast && <Video className="size-3.5 shrink-0 text-fg-3" aria-label="mit Meet-Link" />}
              </li>
            );
          })}
        </ul>
      )}
      <NewMeetingDialog
        open={creating}
        onOpenChange={setCreating}
        defaults={{ date: today, time: `${String(Math.min(23, Math.floor(viennaParts(new Date()).minutes / 60) + 1)).padStart(2, "0")}:00`, area_id }}
        onCreate={(input) => actions.create({ ...input, organization_id })}
      />
    </section>
  );
}
