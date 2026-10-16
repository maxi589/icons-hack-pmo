"use client";

import { createContext, useContext } from "react";
import { Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/avatar";
import { useTeam } from "@/components/app-shell/team-provider";
import { joinUrl, timeRange, type Meeting } from "@/lib/meetings";
import type { Organization } from "@/lib/pipeline";
import { MeetingMenu } from "./meeting-menu";
import { PrivateMark } from "./private-toggle";

// Eine Termin-Zeile (Liste am Desktop, Woche am Handy): Uhrzeit · Bereichsstrich · Titel (darunter Bereich, Ort, Firma)
// · Beitreten · Teilnehmende. Rechtsklick bzw. langes Drücken öffnet das Menü (Öffnen, Link kopieren, Löschen).
// Die Firmen kommen einmal von der Seite (MeetingOrgs), nicht je Zeile: sonst lädt jede Zeile die ganze Pipeline
// und öffnet einen eigenen Live-Kanal (gemessen 15.10.: 22 Abfragen für eine Handy-Woche).
export const MeetingOrgs = createContext<Organization[] | null>(null);

export function MeetingRow({
  meeting: m,
  selected,
  onOpen,
  onDelete,
}: {
  meeting: Meeting;
  selected: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const { areaById, personById, me } = useTeam();
  const orgs = useContext(MeetingOrgs);
  const area = areaById(m.area_id);
  const org = orgs?.find((o) => o.id === m.organization_id);
  const sub = [area?.name, m.location, org?.name].filter(Boolean).join(" · ");
  const others = m.attendees.map((id) => personById(id)).filter((p) => !!p);
  const join = joinUrl(m);

  return (
    <MeetingMenu meeting={m} onOpen={onOpen} onDelete={onDelete}>
      <li
        className={cn(
          "relative flex min-h-[52px] items-center gap-3 border-t border-line px-3.5 py-2 first:border-t-0 md:min-h-14 md:py-2.5",
          selected ? "bg-active" : "hover:bg-hover"
        )}
      >
        <span className="w-[86px] shrink-0 text-[12.5px] text-fg-2 tabular max-md:w-[78px]">{timeRange(m)}</span>
        <span className="h-8 w-[3px] shrink-0 rounded-full bg-line-2" style={area ? { background: area.color } : undefined} aria-hidden />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <button
            type="button"
            onClick={onOpen}
            aria-current={selected ? "true" : undefined}
            className="flex min-w-0 items-center gap-1.5 rounded-sm text-left text-[14px] font-medium after:absolute after:inset-0 max-md:text-[15px]"
          >
            <span className="truncate">{m.title}</span>
            {m.private_for && <PrivateMark />}
            {me && m.attendees.includes(me.id) && <span className="sr-only">, du bist dabei</span>}
          </button>
          {sub && <span className="truncate text-[12.5px] text-fg-3">{sub}</span>}
        </span>
        {join && (
          <a
            href={join}
            target="_blank"
            rel="noopener noreferrer"
            className="relative z-[1] grid size-8 shrink-0 place-items-center rounded-lg text-fg-3 hover:bg-active hover:text-fg max-md:size-10"
            aria-label={`„${m.title}“ beitreten`}
            title="Beitreten"
          >
            <Video className="size-4" aria-hidden />
          </a>
        )}
        <span className="flex shrink-0 -space-x-1.5 max-sm:hidden">
          {others.slice(0, 4).map((p) => (
            <span key={p.id} className="rounded-full shadow-[0_0_0_2px_var(--card)]">
              <Avatar person={p} size={22} />
            </span>
          ))}
          {others.length > 4 && (
            <span className="grid size-[22px] place-items-center rounded-full bg-active text-[10px] text-fg-2">+{others.length - 4}</span>
          )}
        </span>
      </li>
    </MeetingMenu>
  );
}
