"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Link2, Trash2, X } from "lucide-react";
import { Feed } from "@/components/feed";
import { EditText, miniButton, PropRow, SelectBox } from "@/components/detail-fields";
import { useTeam } from "@/components/app-shell/team-provider";
import { cn } from "@/lib/utils";
import { targetHref } from "@/lib/links";
import type { Decision, DecisionPatch } from "@/lib/data/use-knowledge";
import { parseTopic, PeoplePicker, TopicOptions, topicValue, type Topic } from "./pickers";

// Entscheidung im Detail (rechts 400px; am Handy als Bottom Sheet). Alle Felder speichern sofort bzw. beim Verlassen.

export function DecisionDetail({
  decision: d,
  topics,
  onUpdate,
  onDelete,
  onClose,
}: {
  decision: Decision;
  topics: Topic[];
  onUpdate: (patch: DecisionPatch) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const { allAreas } = useTeam();
  const [copied, setCopied] = useState(false);
  const f = (name: string) => `dec-${d.id}-${name}`;
  const area = allAreas.find((a) => a.id === d.area_id);

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/wissen?entscheidung=${d.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-start gap-2 border-b border-line px-[18px] pt-4 pb-3.5">
        <h2 className="min-w-0 flex-1">
          <span className="label-mono block px-2 pb-1">Entscheidung</span>
          <span className="sr-only">Was wurde entschieden</span>
          <EditText
            id={f("title")}
            value={d.title}
            placeholder="Was wurde entschieden?"
            required
            wrap
            onSave={(v) => v && onUpdate({ title: v })}
            className="text-base font-semibold tracking-[-0.01em] md:text-base"
          />
        </h2>
        <button type="button" onClick={copyLink} className={cn(miniButton, "mt-5")} aria-label="Link zu dieser Entscheidung kopieren">
          <Link2 className="mr-1 size-3.5" aria-hidden />
          <span aria-live="polite">{copied ? "Kopiert" : "Link"}</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 grid size-8 shrink-0 place-items-center rounded-lg text-fg-3 hover:bg-hover hover:text-fg max-md:size-11"
          aria-label="Detail schließen"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <div className="flex flex-col border-b border-line px-[18px] py-2.5">
        <div className="flex flex-col gap-1 py-1.5">
          <label htmlFor={f("reason")} className="text-[13px] text-fg-3">
            Warum
          </label>
          <EditText id={f("reason")} value={d.reason} placeholder="Begründung, Alternativen, was dagegen sprach …" onSave={(v) => onUpdate({ reason: v })} multiline />
        </div>
        <PropRow label="Wann" htmlFor={f("date")}>
          <input
            id={f("date")}
            type="date"
            value={d.decided_on}
            onChange={(e) => e.target.value && onUpdate({ decided_on: e.target.value })}
            className="h-8 rounded-lg bg-transparent px-2 text-[13px] text-fg tabular hover:bg-hover max-md:text-base"
          />
        </PropRow>
        <div className="flex flex-col gap-1.5 py-1.5">
          <span className="text-[13px] text-fg-3">Wer</span>
          <PeoplePicker value={d.decided_by} onChange={(ids) => onUpdate({ decided_by: ids })} size="sm" />
        </div>
        <PropRow label="Bereich" htmlFor={f("area")}>
          <span className="flex items-center gap-1">
            <span className="ml-1.5 size-[7px] shrink-0 rounded-full bg-line-2" style={area ? { background: area.color } : undefined} aria-hidden />
            <span className="flex-1">
              <SelectBox id={f("area")} value={d.area_id ?? ""} onChange={(v) => onUpdate({ area_id: v || null })}>
                <option value="">Kein Bereich</option>
                {allAreas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </SelectBox>
            </span>
          </span>
        </PropRow>
        <PropRow label="Thema" htmlFor={f("topic")}>
          <span className="flex items-center gap-1">
            <span className="min-w-0 flex-1">
              <SelectBox id={f("topic")} value={topicValue(d.target_type, d.target_id)} onChange={(v) => onUpdate(parseTopic(v))}>
                <TopicOptions topics={topics} />
              </SelectBox>
            </span>
            {d.target_type && d.target_id && (
              <Link
                href={targetHref(d.target_type, d.target_id)}
                className="grid size-8 shrink-0 place-items-center rounded-lg text-fg-3 hover:bg-hover hover:text-fg"
                aria-label="Verknüpftes Thema öffnen"
              >
                <ArrowUpRight className="size-3.5" aria-hidden />
              </Link>
            )}
          </span>
        </PropRow>
        <div className="flex justify-end pt-1 pb-1">
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] text-fg-3 transition-colors duration-150 hover:bg-hover hover:text-st-red max-md:min-h-11"
          >
            <Trash2 className="size-3.5" aria-hidden />
            Entscheidung löschen
          </button>
        </div>
      </div>

      <div className="px-[18px] pt-3.5 pb-6">
        <Feed targetType="decision" targetId={d.id} describe={(a) => (a.action === "created" ? "hat die Entscheidung festgehalten" : a.action)} />
      </div>
    </div>
  );
}
