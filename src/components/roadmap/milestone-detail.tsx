"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, ListTodo, MessageSquare, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/avatar";
import { Chip, DueChip } from "@/components/chip";
import { MilestoneChecklist } from "@/components/milestone-checklist";
import { CopyLinkButton } from "@/components/copy-link-button";
import { Feed } from "@/components/feed";
import { useTeam } from "@/components/app-shell/team-provider";
import { formatShort } from "@/lib/dates";
import type { Milestone } from "@/lib/data/use-milestones";

// Ein Meilenstein im Detail: Kopf, Beschreibung aus der Excel, Unterpunkte, Status, Link-Icon in der Ecke.
// Unter dem Zeitstrahl als Detail-Panel (Verlauf + Kommentare offen), in der Liste als Karte (Kommentare
// aufklappbar, damit nicht alle Verläufe gleichzeitig laden; die per Direktlink markierte Karte startet offen).

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
  feed = "toggle",
  onClose,
}: {
  milestone: Milestone;
  subs: Milestone[];
  parent: Milestone | null;
  today: string;
  onToggle: (id: string, done: boolean) => void;
  onSelect?: (id: string) => void;
  highlighted?: boolean;
  as?: "section" | "article";
  feed?: "open" | "toggle";
  /** Im Handy-Sheet: ohne Kartenrahmen, mit „Detail schließen“ in der Kopfzeile */
  onClose?: () => void;
}) {
  const { areaById, personById } = useTeam();
  const area = areaById(m.area_id);
  const owner = personById(area?.owner_id);
  const done = m.status === "erledigt";
  const [feedOpen, setFeedOpen] = useState(highlighted);
  const showFeed = feed === "open" || feedOpen;

  return (
    <Tag
      id={`ms-${m.id}`}
      className={cn(
        "flex scroll-mt-4 flex-wrap items-start gap-x-6 gap-y-4",
        onClose ? "px-4 pt-2 pb-6" : "rounded-[14px] bg-card p-4 md:px-[22px] md:py-[18px]",
        !onClose && (highlighted ? "shadow-[0_0_0_1.5px_var(--accLine)]" : "shadow-card")
      )}
    >
      <div className="flex min-w-0 flex-[1.4_1_420px] flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[12.5px] text-fg-2">
          <span className="font-mono text-fg-3">{m.id}</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-[7px] rounded-full" style={{ background: area?.color }} aria-hidden />
            {area?.name}
          </span>
          {done && <span className="tabular">· {formatShort(m.due_date)}</span>}
          {done ? (
            <Chip tone="green">
              <Check className="size-3" strokeWidth={3} aria-hidden />
              erledigt
            </Chip>
          ) : (
            <DueChip due={m.due_date} today={today} />
          )}
          <CopyLinkButton path={`/roadmap?m=${m.id}`} label={`Link zu ${m.id} kopieren`} className="-my-1 ml-auto" />
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="-my-1.5 -mr-2 grid size-11 place-items-center rounded-lg text-fg-3 hover:bg-hover hover:text-fg"
              aria-label="Detail schließen"
            >
              <X className="size-[18px]" aria-hidden />
            </button>
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
          {owner ? (
            <span>
              <span className="sr-only">Verantwortlich: </span>
              {owner.name}
            </span>
          ) : (
            <span className="text-st-amber">Verantwortlich offen</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 pt-1.5">
          {done ? (
            <button type="button" onClick={() => onToggle(m.id, false)} className={ghostBtn}>
              <RotateCcw className="size-3.5" aria-hidden />
              Wieder öffnen
            </button>
          ) : (
            <button type="button" onClick={() => onToggle(m.id, true)} className={ghostBtn}>
              <Check className="size-3.5 text-acc-line" strokeWidth={2.4} aria-hidden />
              Erledigt
            </button>
          )}
          <Link href={`/aufgaben?meilenstein=${m.id}`} className={ghostBtn}>
            <ListTodo className="size-3.5" aria-hidden />
            Aufgaben dazu
          </Link>
          {feed === "toggle" && (
            <button type="button" onClick={() => setFeedOpen((o) => !o)} aria-expanded={feedOpen} className={ghostBtn}>
              <MessageSquare className="size-3.5" aria-hidden />
              Kommentare
              <ChevronDown className={cn("size-3.5 transition-transform duration-200 motion-reduce:transition-none", feedOpen && "rotate-180")} aria-hidden />
            </button>
          )}
        </div>
      </div>

      {subs.length > 0 && (
        <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-2">
          <h3 className="label-mono">Gehört dazu</h3>
          <MilestoneChecklist items={subs} onToggle={onToggle} showDate showId />
        </div>
      )}

      {showFeed && (
        <div className="min-w-0 basis-full border-t border-line pt-4">
          <Feed targetType="milestone" targetId={m.id} describe={(a) => a.action} />
        </div>
      )}
    </Tag>
  );
}
