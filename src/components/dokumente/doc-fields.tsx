"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PropRow, SelectBox } from "@/components/detail-fields";
import { useTeam } from "@/components/app-shell/team-provider";
import { parseTopic, TopicOptions, topicValue, type Topic } from "@/components/wissen/pickers";
import { targetHref } from "@/lib/links";
import { formatShort, todayInVienna } from "@/lib/dates";
import type { Doc, DocPatch, DocTarget } from "@/lib/documents";

// Gemeinsame Eigenschafts-Zeilen für Dokumente: Bereich, gehört zu, von · wann.

export function DocProps({ doc: d, topics, onUpdate }: { doc: Doc; topics: Topic[]; onUpdate: (p: DocPatch) => void }) {
  const { allAreas, personById } = useTeam();
  const f = (name: string) => `doc-${d.id}-${name}`;
  const area = allAreas.find((a) => a.id === d.area_id);
  const by = personById(d.created_by);
  const changedBy = personById(d.updated_by);

  return (
    <>
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
      <PropRow label="Gehört zu" htmlFor={f("topic")}>
        <span className="flex items-center gap-1">
          <span className="min-w-0 flex-1">
            <SelectBox
              id={f("topic")}
              value={topicValue(d.target_type, d.target_id)}
              onChange={(v) => {
                const t = parseTopic(v);
                onUpdate({ target_type: t.target_type as DocTarget | null, target_id: t.target_id });
              }}
            >
              <TopicOptions topics={topics} />
            </SelectBox>
          </span>
          {d.target_type && d.target_id && (
            <Link
              href={targetHref(d.target_type, d.target_id)}
              className="grid size-8 shrink-0 place-items-center rounded-lg text-fg-3 hover:bg-hover hover:text-fg"
              aria-label="Verknüpften Eintrag öffnen"
            >
              <ArrowUpRight className="size-3.5" aria-hidden />
            </Link>
          )}
        </span>
      </PropRow>
      <PropRow label="Von">
        <span className="block px-2 leading-8 text-fg-2">
          {[by?.name, formatShort(todayInVienna(new Date(d.created_at)))].filter(Boolean).join(" · ")}
          {changedBy && d.updated_by !== d.created_by && (
            <span className="text-fg-3"> · zuletzt {changedBy.name}</span>
          )}
        </span>
      </PropRow>
    </>
  );
}

/** Name des verknüpften Eintrags für Listen („Firma Red Bull“). */
export function topicLabel(topics: Topic[], type: string | null, id: string | null) {
  if (!type || !id) return null;
  const t = topics.find((x) => x.type === type && x.id === id);
  return t ? t.label.trim() : "nicht mehr vorhanden";
}
