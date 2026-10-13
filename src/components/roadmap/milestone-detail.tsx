"use client";

import { useState } from "react";
import { Check, Link2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/avatar";
import { Chip, DueChip } from "@/components/chip";
import { MilestoneChecklist } from "@/components/milestone-checklist";
import { useTeam } from "@/components/app-shell/team-provider";
import { formatShort } from "@/lib/dates";
import type { Milestone } from "@/lib/data/use-milestones";

// Ein Meilenstein im Detail: Kopf, Beschreibung aus der Excel, Unterpunkte, Status und „Link kopieren“.
// Unter dem Zeitstrahl als Detail-Panel, in der Liste als Karte.

const ghostBtn =
  "inline-flex h-8 items-center gap-1.5 rounded-[9px] px-3 text-[13px] font-medium text-fg-2 shadow-[inset_0_0_0_1px_var(--line2)] transition-[background,color,scale] duration-150 hover:bg-hover hover:text-fg active:scale-[.97]";

export function MilestoneDetail({
  milestone: m,
  subs,
  parent,
  today,
  onToggle,
  onSelect,
  highlighted = false,
  as: Tag = "section",
}: {
  milestone: Milestone;
  subs: Milestone[];
  parent: Milestone | null;
  today: string;
  onToggle: (id: string, done: boolean) => void;
  onSelect?: (id: string) => void;
  highlighted?: boolean;
  as?: "section" | "article";
}) {
  const { areaById, personById } = useTeam();
  const [copied, setCopied] = useState(false);
  const area = areaById(m.area_id);
  const owner = personById(area?.owner_id);
  const done = m.status === "erledigt";

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/roadmap?m=${m.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Tag
      id={`ms-${m.id}`}
      className={cn(
        "flex scroll-mt-4 flex-wrap items-start gap-x-6 gap-y-4 rounded-[14px] bg-card p-4 md:px-[22px] md:py-[18px]",
        highlighted ? "shadow-[0_0_0_1.5px_var(--accLine)]" : "shadow-card"
      )}
    >
      <div className="flex min-w-0 flex-[1.4_1_420px] flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[12.5px] text-fg-2">
          <span className="font-mono text-fg-3">{m.id}</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-[7px] rounded-full" style={{ background: area?.color }} aria-hidden />
            {area?.name}
          </span>
          <span className="tabular">· {formatShort(m.due_date)}</span>
          {done ? (
            <Chip tone="green">
              <Check className="size-3" strokeWidth={3} aria-hidden />
              erledigt
            </Chip>
          ) : (
            <DueChip due={m.due_date} today={today} />
          )}
        </div>
        <h2 className={cn("text-[17px] leading-[1.3] font-semibold tracking-[-0.015em] md:text-[19px]", done && "text-fg-2")}>{m.title}</h2>
        {m.description && <p className="text-[14px] leading-[1.55] text-fg-2">{m.description}</p>}
        {parent && (
          <p className="text-[13px] text-fg-3">
            Teil von{" "}
            {onSelect ? (
              <button type="button" onClick={() => onSelect(parent.id)} className="rounded-sm text-fg-2 underline decoration-line-2 underline-offset-4 hover:text-fg">
                {parent.id} · {parent.title}
              </button>
            ) : (
              <span className="text-fg-2">
                {parent.id} · {parent.title}
              </span>
            )}
          </p>
        )}
        <div className="flex items-center gap-2 pt-1 text-[12.5px] text-fg-2">
          <Avatar person={owner} size={20} />
          {owner ? `${owner.name} (verantwortlich für ${area?.name})` : <span className="text-st-amber">Verantwortlich offen</span>}
        </div>
        <div className="flex flex-wrap gap-2 pt-1.5">
          {done ? (
            <button type="button" onClick={() => onToggle(m.id, false)} className={ghostBtn}>
              <RotateCcw className="size-3.5" aria-hidden />
              Wieder öffnen
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onToggle(m.id, true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-[9px] bg-acc px-3 text-[13px] font-medium text-acc-text transition-[scale] duration-150 active:scale-[.97]"
            >
              <Check className="size-3.5" strokeWidth={2.4} aria-hidden />
              Als erledigt markieren
            </button>
          )}
          <button type="button" onClick={copyLink} className={ghostBtn}>
            <Link2 className="size-3.5" aria-hidden />
            <span aria-live="polite">{copied ? "Link kopiert" : "Link kopieren"}</span>
          </button>
        </div>
      </div>

      <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-2">
        <h3 className="label-mono">Gehört dazu</h3>
        {subs.length > 0 ? (
          <MilestoneChecklist items={subs} onToggle={onToggle} showDate showId />
        ) : (
          <p className="text-[13px] text-fg-3">Keine Unterpunkte.</p>
        )}
      </div>
    </Tag>
  );
}
