"use client";

import { cn } from "@/lib/utils";
import { Avatar } from "@/components/avatar";
import { Chip } from "@/components/chip";
import { useTeam } from "@/components/app-shell/team-provider";
import { followState, initials, warmLine, type Organization } from "@/lib/pipeline";

// Karte im Board (Board „Pipeline“): Initialen, Name, Prio, „warm über X · Welle n“, Nachfass-Chip, Avatar.
export function OrgCard({ org, today, selected, onOpen }: { org: Organization; today: string; selected: boolean; onOpen: () => void }) {
  const { personById } = useTeam();
  const follow = followState(org, today);
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "flex w-full cursor-pointer flex-col gap-[9px] rounded-[10px] bg-card px-3 py-[11px] text-left transition-shadow duration-150",
        selected ? "shadow-[0_0_0_1.5px_var(--accLine),0_1px_2px_rgba(0,0,0,.2)]" : "shadow-card hover:shadow-[0_0_0_1px_var(--line2)]"
      )}
    >
      <span className="flex w-full items-center gap-2">
        <span className="grid size-6 shrink-0 place-items-center rounded-md bg-active text-[10px] font-semibold text-fg-2" aria-hidden>
          {initials(org.name)}
        </span>
        <span className="min-w-0 flex-1 text-[13px] leading-[1.3] font-medium">{org.name}</span>
        {org.prio && (
          <span className="rounded-[5px] px-[5px] py-px font-mono text-[10.5px] font-medium text-fg-2 shadow-[inset_0_0_0_1px_var(--line2)]">
            <span className="sr-only">Prio </span>
            {org.prio}
          </span>
        )}
      </span>
      <span className="text-[12px] text-fg-2">{warmLine(org)}</span>
      {(follow || org.owner_id) && (
        <span className="flex w-full items-center gap-1.5">
          {follow && (
            <Chip tone={follow.tone} dot={follow.tone === "red"} className="h-5 px-[7px] text-[11px]">
              <span className="sr-only">Nachfassen </span>
              {follow.label}
            </Chip>
          )}
          <span className="ml-auto">
            <Avatar person={personById(org.owner_id)} size={20} />
          </span>
        </span>
      )}
    </button>
  );
}
