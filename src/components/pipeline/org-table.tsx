"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/avatar";
import { Chip } from "@/components/chip";
import { useTeam, type Person } from "@/components/app-shell/team-provider";
import { followState, initials, STAGES, type Organization, type Stage } from "@/lib/pipeline";

// Pipeline als CRM-Tabelle (nur Desktop, Maxi 14.10.: Variante „D“ nach Prüfschleife).
// Standard: sortiert nach Nachfassen, Überfälliges oben. Jeder Spaltenkopf sortiert per Klick.
// Kopf klebt beim Scrollen, unten Zähler. Bewusst ohne Rasterlinien und Pills.
// Feste Spaltenbreiten mit gleichem Abstand (Maxi, 14.10.: „überall gleich“), freier Platz sammelt sich rechts in
// einer leeren Füllspalte. So bleiben die Spalten stehen, wenn rechts das Detail aufgeht.
// Kein seitliches Scrollen: Die Tabelle misst ihre eigene Breite (Container-Abfrage). Wird es eng, fällt zuerst die
// Füllspalte weg (Firma nimmt den Rest; Summe der festen Spalten 1020px, passt neben das offene Detail ab ~1700px Fenster), dann „Warmer Kontakt“/„Kapazität“, dann „Prio“.
// Venues zeigen nur die Kapazität kurz; Übernachtung, Preis und Lage stehen im Detail.

type SortKey = "name" | "stage" | "prio" | "follow" | "owner" | "extra";

const STAGE_ORDER: Record<Stage, number> = { recherche: 0, kontaktiert: 1, im_gespraech: 2, zugesagt: 3, fix: 4, abgesagt: 5 };
const PRIO_ORDER = { A: 0, B: 1, C: 2 } as const;

const warmText = (o: Organization) => [o.warm_via && `über ${o.warm_via}`, o.existing_contact].filter(Boolean).join(" · ");
/** „Festsaal 180, Mi…“ → „Festsaal 180“ (voller Text als Tooltip). */
const shortCap = (c: string | null) => (c ? c.split(/[,;(]/)[0].trim() : "");

function value(o: Organization, key: SortKey, venue: boolean, personById: (id: string | null) => Person | null): string | number {
  switch (key) {
    case "name":
      return o.name.toLowerCase();
    case "stage":
      return STAGE_ORDER[o.stage];
    case "prio":
      return o.prio ? PRIO_ORDER[o.prio] : 9;
    case "follow":
      // Ohne Termin bzw. bei Fix/Abgesagt ans Ende
      return followState(o, "0000") ? (o.next_follow_up ?? "9999") : "9999";
    case "owner":
      return personById(o.owner_id)?.name ?? "~";
    case "extra":
      return venue ? Number.parseInt((o.capacity ?? "").replace(/\D+/g, " ").trim().split(" ")[0] ?? "", 10) || 0 : warmText(o) || "~";
  }
}

export function OrgTable({
  orgs,
  today,
  venue,
  selectedId,
  onOpen,
}: {
  orgs: Organization[];
  today: string;
  venue: boolean;
  selectedId: string | null;
  onOpen: (id: string) => void;
}) {
  const { personById } = useTeam();
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({ key: "follow", asc: true });

  const rows = [...orgs].sort((a, b) => {
    const x = value(a, sort.key, venue, personById);
    const y = value(b, sort.key, venue, personById);
    const c = x < y ? -1 : x > y ? 1 : a.name.localeCompare(b.name, "de");
    return sort.asc ? c : -c;
  });
  const follow = rows.map((o) => followState(o, today));

  const head = (key: SortKey, label: string, className?: string) => {
    const active = sort.key === key;
    const Icon = active ? (sort.asc ? ArrowUp : ArrowDown) : ChevronsUpDown;
    return (
      <th
        aria-sort={active ? (sort.asc ? "ascending" : "descending") : undefined}
        className={cn("sticky top-0 z-[2] h-9 border-b border-line bg-panel px-3 text-left font-medium", className)}
      >
        <button
          type="button"
          onClick={() => setSort((s) => ({ key, asc: s.key === key ? !s.asc : true }))}
          className={cn("group/h inline-flex items-center gap-1 rounded-sm hover:text-fg", active && "text-fg")}
        >
          {label}
          <Icon className={cn("size-3", active ? "opacity-100" : "opacity-0 group-hover/h:opacity-60")} aria-hidden />
        </button>
      </th>
    );
  };

  // Spalten, die bei wenig Platz verschwinden bzw. schrumpfen (Breite der Tabelle, nicht des Fensters)
  const hideFill = "@max-[1020px]:hidden";
  const hideExtra = "@max-[900px]:hidden";
  const hidePrio = "@max-[700px]:hidden";

  return (
    <div className="@container flex min-h-full flex-col">
      <table className="w-full table-fixed border-separate border-spacing-0 text-[13px]">
        <thead className="text-[12px] text-fg-3">
          <tr>
            {head("name", venue ? "Venue" : "Firma", "z-[3] w-[300px] pl-[18px] @max-[1020px]:w-auto")}
            {head("stage", "Stufe", "w-[128px]")}
            {head("prio", "Prio", cn("w-[60px]", hidePrio))}
            {head("follow", "Nachfassen", "w-[176px]")}
            {head("owner", "Zuständig", "w-[136px]")}
            {head("extra", venue ? "Kapazität" : "Warmer Kontakt", cn("w-[220px]", hideExtra))}
            <th aria-hidden className={cn("sticky top-0 z-[2] h-9 border-b border-line bg-panel", hideFill)} />
          </tr>
        </thead>
        <tbody>
          {rows.map((o, i) => {
            const sel = o.id === selectedId;
            const st = STAGES.find((s) => s.id === o.stage)!;
            const f = follow[i];
            const owner = personById(o.owner_id);
            const sub = [o.category, o.location].filter(Boolean).join(" · ");
            const cell = "h-11 overflow-hidden border-b border-line px-3 whitespace-nowrap";
            return (
              <tr
                key={o.id}
                onClick={() => onOpen(o.id)}
                className={cn("cursor-pointer transition-colors duration-150", sel ? "bg-active" : "hover:bg-hover")}
              >
                <td className="h-11 overflow-hidden border-b border-line pr-3 pl-[18px]">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="grid size-[26px] shrink-0 place-items-center rounded-md bg-active text-[10.5px] font-semibold text-fg-2" aria-hidden>
                      {initials(o.name)}
                    </span>
                    <span className="flex min-w-0 flex-col leading-tight">
                      {/* Echter Knopf für Tastatur und Screenreader; die ganze Zeile ist zusätzlich klickbar */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpen(o.id);
                        }}
                        aria-current={sel ? "true" : undefined}
                        className="truncate rounded-sm text-left font-medium"
                      >
                        {o.name}
                      </button>
                      {sub && <span className="truncate text-[11.5px] text-fg-3">{sub}</span>}
                    </span>
                  </span>
                </td>
                <td className={cell}>
                  <span className="inline-flex items-center gap-2">
                    <span className={cn("size-[7px] shrink-0 rounded-full", st.dot)} aria-hidden />
                    {st.name}
                  </span>
                </td>
                <td className={cn(cell, hidePrio)}>
                  {o.prio && (
                    <span className="rounded-[5px] px-[5px] py-px font-mono text-[11px] font-medium text-fg-2 shadow-[inset_0_0_0_1px_var(--line2)]">
                      <span className="sr-only">Prio </span>
                      {o.prio}
                    </span>
                  )}
                </td>
                <td className={cell}>
                  {f && (f.tone === "gray" ? <span className="text-fg-2 tabular">{f.label}</span> : <Chip tone={f.tone}>{f.label}</Chip>)}
                </td>
                <td className={cell}>
                  {owner ? (
                    <span className="flex min-w-0 items-center gap-2" title={owner.name}>
                      <Avatar person={owner} size={20} />
                      <span className="truncate">{owner.name}</span>
                    </span>
                  ) : (
                    <span className="text-fg-3">–</span>
                  )}
                </td>
                <td className={cn(cell, hideExtra, "text-fg-2")} title={(venue ? o.capacity : warmText(o)) || undefined}>
                  <span className="block truncate">{venue ? shortCap(o.capacity) : warmText(o)}</span>
                </td>
                <td aria-hidden className={cn("h-11 border-b border-line", hideFill)} />
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="sticky bottom-0 z-[2] mt-auto flex h-9 shrink-0 items-center gap-4 border-t border-line bg-panel px-[18px] text-[12px] text-fg-3 tabular">
        <span className="text-fg-2">{rows.length} Einträge</span>
        <span className="ml-auto flex gap-4">
          {STAGES.map((s) => {
            const n = rows.filter((o) => o.stage === s.id).length;
            return n ? (
              <span key={s.id} className="inline-flex items-center gap-1.5">
                <span className={cn("size-1.5 rounded-full", s.dot)} aria-hidden />
                {s.name} {n}
              </span>
            ) : null;
          })}
        </span>
      </div>
    </div>
  );
}
