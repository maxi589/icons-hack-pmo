"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronDown, ExternalLink, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/avatar";
import { useToast } from "@/components/toast";
import { MobileSheet } from "@/components/mobile-sheet";
import { PageHeader } from "@/components/app-shell/page-header";
import { useTeam } from "@/components/app-shell/team-provider";
import { useToday } from "@/lib/use-today";
import { useIsMobile } from "@/lib/use-is-mobile";
import { useKnowledge, type Decision, type LinkItem } from "@/lib/data/use-knowledge";
import { useMilestones } from "@/lib/data/use-milestones";
import { useOrganizations } from "@/lib/data/use-organizations";
import { useTasks } from "@/lib/data/use-tasks";
import { logActivity } from "@/lib/data/use-feed";
import { TARGET_NAMES } from "@/lib/links";
import { milestoneOptions } from "@/lib/tasks";
import { DecisionDetail } from "./decision-detail";
import { LinkDialog, NewDecisionDialog } from "./dialogs";
import type { Topic } from "./pickers";

// Wissen & Entscheidungen (Umfang v1): Entscheidungs-Log (was, wann, wer, warum, verknüpft mit dem Thema)
// und Linksammlung. Zustand in der Adresse: ?entscheidung=<id> (teilbar), ?neu=1 (Taste E).

const iconBtn =
  "relative z-[1] grid size-8 shrink-0 place-items-center rounded-lg text-fg-3 transition-colors duration-150 hover:bg-hover hover:text-fg max-md:size-11";

export function Knowledge() {
  const today = useToday();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const toast = useToast();
  const isMobile = useIsMobile();
  const { me, allAreas } = useTeam();
  const k = useKnowledge();
  const { milestones } = useMilestones();
  const { orgs } = useOrganizations();
  const { tasks } = useTasks();

  const [query, setQuery] = useState("");
  const [area, setArea] = useState("");
  const [linkDialog, setLinkDialog] = useState<{ open: boolean; link: LinkItem | null }>({ open: false, link: null });

  const selectedId = params.get("entscheidung");
  const newOpen = params.get("neu") === "1";

  const setParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, v] of Object.entries(patch)) {
      if (v === null) next.delete(key);
      else next.set(key, v);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const topics: Topic[] = useMemo(
    () => [
      ...milestoneOptions(milestones ?? []).map((m) => ({ type: "milestone" as const, id: m.id, label: `${m.parent_id ? "   " : ""}${m.id} · ${m.title}` })),
      ...[...(orgs ?? [])].sort((a, b) => a.name.localeCompare(b.name, "de")).map((o) => ({ type: "organization" as const, id: o.id, label: o.name })),
      ...(tasks ?? []).filter((t) => t.status !== "erledigt").map((t) => ({ type: "task" as const, id: t.id, label: t.title })),
    ],
    [milestones, orgs, tasks]
  );

  if (!k.decisions || !k.links || !today) {
    return (
      <>
        <PageHeader title="Wissen" />
        <div className="m-3.5 h-[420px] rounded-xl bg-card-2 md:m-5" aria-busy="true" aria-label="Wissen lädt" />
      </>
    );
  }

  const selected = k.decisions.find((d) => d.id === selectedId) ?? null;
  const q = query.trim().toLowerCase();
  const visible = k.decisions
    .filter((d) => !area || d.area_id === area)
    .filter((d) => !q || [d.title, d.reason].some((v) => v?.toLowerCase().includes(q)));
  const months = [...new Set(visible.map((d) => d.decided_on.slice(0, 7)))];

  const deleteDecision = (d: Decision) => {
    setParams({ entscheidung: null });
    k.removeDecision(d);
    toast({ text: `„${d.title}“ gelöscht`, onAction: () => k.restoreDecision(d) });
  };

  const deleteLink = (l: LinkItem) => {
    k.removeLink(l);
    toast({ text: `Link „${l.title}“ gelöscht`, onAction: () => k.restoreLink(l) });
  };

  const detail = selected && (
    <DecisionDetail
      key={selected.id}
      decision={selected}
      topics={topics}
      onUpdate={(p) => k.updateDecision(selected.id, p)}
      onDelete={() => deleteDecision(selected)}
      onClose={() => setParams({ entscheidung: null })}
    />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title="Wissen" action={{ label: "Entscheidung", onClick: () => setParams({ neu: "1" }) }} />
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 md:overflow-auto">
          <div className="mx-auto grid w-full max-w-[1440px] gap-5 px-3.5 pt-2 pb-8 md:grid-cols-[minmax(0,1fr)_300px] md:px-6 md:pt-6">
            {/* Entscheidungen */}
            <section className="flex min-w-0 flex-col gap-3" aria-labelledby="dec-title">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 id="dec-title" className="mr-auto text-[21px] font-semibold tracking-[-0.025em] md:text-[22px]">
                  Entscheidungen
                </h1>
                <button
                  type="button"
                  onClick={() => setParams({ neu: "1" })}
                  className="inline-flex h-10 items-center rounded-[9px] bg-acc px-3.5 text-[14px] font-medium text-acc-text md:hidden"
                >
                  + Entscheidung
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="relative flex min-w-0 flex-1 items-center md:max-w-[260px]">
                  <Search className="pointer-events-none absolute left-2.5 size-3.5 text-fg-3" aria-hidden />
                  <span className="sr-only">Entscheidungen durchsuchen</span>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Suchen …"
                    className="h-8 w-full rounded-[9px] border border-field bg-card pr-2.5 pl-8 text-[13px] text-fg placeholder:text-fg-3 focus-visible:outline-solid max-md:h-10 max-md:text-base"
                  />
                </label>
                <label className="relative inline-flex items-center">
                  <span className="sr-only">Bereich</span>
                  <select
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className={cn(
                      "h-8 cursor-pointer appearance-none rounded-[9px] border border-field bg-card pr-7 pl-2.5 text-[13px] text-fg focus-visible:outline-solid max-md:h-10 max-md:text-base",
                      area && "bg-active"
                    )}
                  >
                    <option value="">Alle Bereiche</option>
                    {allAreas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 size-3.5 text-fg-3" aria-hidden />
                </label>
              </div>

              {k.decisions.length === 0 ? (
                <div className="flex flex-col items-center gap-2.5 rounded-[14px] bg-card-2 px-4 py-12 text-center">
                  <p className="text-sm font-medium">Noch keine Entscheidungen</p>
                  <button
                    type="button"
                    onClick={() => setParams({ neu: "1" })}
                    className="mt-1 inline-flex h-8 items-center rounded-[9px] bg-acc px-3 text-[13px] font-medium text-acc-text max-md:h-10"
                  >
                    + Entscheidung
                  </button>
                </div>
              ) : visible.length === 0 ? (
                <p className="px-1 py-6 text-center text-[13.5px] text-fg-2">Keine Treffer.</p>
              ) : (
                months.map((m) => (
                  <div key={m} className="flex flex-col gap-2">
                    <h2 className="label-mono px-1">{format(parseISO(`${m}-01`), "MMMM yyyy", { locale: de })}</h2>
                    <ul className="overflow-hidden rounded-xl bg-card shadow-card">
                      {visible
                        .filter((d) => d.decided_on.startsWith(m))
                        .map((d) => (
                          <DecisionRow key={d.id} d={d} topics={topics} selected={d.id === selectedId} onOpen={() => setParams({ entscheidung: d.id === selectedId ? null : d.id })} />
                        ))}
                    </ul>
                  </div>
                ))
              )}
            </section>

            {/* Links: am Handy oben, weil man sie unterwegs am häufigsten sucht */}
            <section className="flex flex-col gap-3 max-md:order-first" aria-labelledby="links-title">
              <div className="flex items-center justify-between gap-2 md:h-[33px]">
                <h2 id="links-title" className="text-[15px] font-semibold md:text-[14px]">
                  Links
                </h2>
                <button
                  type="button"
                  onClick={() => setLinkDialog({ open: true, link: null })}
                  className="inline-flex h-8 items-center gap-1 rounded-[9px] px-2.5 text-[13px] font-medium text-fg-2 shadow-[inset_0_0_0_1px_var(--line2)] transition-colors duration-150 hover:bg-hover hover:text-fg max-md:h-10"
                >
                  <Plus className="size-3.5" aria-hidden />
                  Link
                </button>
              </div>
              {k.links.length === 0 ? (
                <p className="rounded-xl bg-card-2 px-3.5 py-4 text-[13px] leading-normal text-fg-2">
                  Noch keine Links.
                </p>
              ) : (
                <ul className="overflow-hidden rounded-xl bg-card shadow-card">
                  {k.links.map((l) => (
                    <li key={l.id} className="group relative flex min-h-12 items-center gap-2.5 border-t border-line pr-1.5 pl-3 first:border-t-0 hover:bg-hover">
                      <a href={l.url} target="_blank" rel="noreferrer" className="flex min-w-0 flex-1 flex-col rounded-sm py-2 after:absolute after:inset-0">
                        <span className="truncate text-[14px] font-medium md:text-[13.5px]">{l.title}</span>
                        <span className="truncate text-[12px] text-fg-3">{hostOf(l.url)}</span>
                      </a>
                      <ExternalLink className="size-3.5 shrink-0 text-fg-3 max-md:hidden" aria-hidden />
                      <button type="button" onClick={() => setLinkDialog({ open: true, link: l })} className={iconBtn} aria-label={`Link „${l.title}“ bearbeiten`}>
                        <Pencil className="size-3.5" aria-hidden />
                      </button>
                      <button type="button" onClick={() => deleteLink(l)} className={cn(iconBtn, "hover:text-st-red")} aria-label={`Link „${l.title}“ löschen`}>
                        <Trash2 className="size-3.5" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>

        {selected && !isMobile && (
          <aside aria-label="Entscheidung im Detail" className="w-[400px] shrink-0 overflow-y-auto border-l border-line bg-card">
            {detail}
          </aside>
        )}
      </div>

      <MobileSheet open={!!selected && isMobile} onClose={() => setParams({ entscheidung: null })} title={selected?.title ?? ""}>
        {detail}
      </MobileSheet>

      <NewDecisionDialog
        open={newOpen}
        onOpenChange={(o) => !o && setParams({ neu: null })}
        today={today}
        topics={topics}
        onCreate={async (input) => {
          const d = await k.createDecision(input);
          if (!d) return false;
          logActivity("decision", d.id, me?.id ?? null, "created");
          setParams({ neu: null });
          toast({ text: `„${d.title}“ festgehalten`, actionLabel: "Öffnen", onAction: () => setParams({ entscheidung: d.id }) });
          return true;
        }}
      />

      <LinkDialog
        key={linkDialog.link?.id ?? "neu"}
        open={linkDialog.open}
        link={linkDialog.link}
        onOpenChange={(o) => setLinkDialog((s) => ({ ...s, open: o }))}
        onSave={async (input) => {
          if (linkDialog.link) return k.updateLink(linkDialog.link.id, input);
          const l = await k.createLink({ ...input, sort: k.links?.length ?? 0, created_by: me?.id ?? null });
          return !!l;
        }}
      />
    </div>
  );
}

function hostOf(url: string) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "") + (u.pathname !== "/" ? u.pathname : "");
  } catch {
    return url;
  }
}

function DecisionRow({ d, topics, selected, onOpen }: { d: Decision; topics: Topic[]; selected: boolean; onOpen: () => void }) {
  const { personById, areaById } = useTeam();
  const area = areaById(d.area_id);
  const topic = d.target_type ? topics.find((t) => t.type === d.target_type && t.id === d.target_id) : null;
  const people = d.decided_by.map((id) => personById(id)).filter((p) => p !== null);

  return (
    <li className={cn("relative flex gap-3 border-t border-line px-3.5 py-3 first:border-t-0", selected ? "bg-active" : "hover:bg-hover")}>
      <span className="w-[38px] shrink-0 pt-px font-mono text-[12px] text-fg-3 tabular">{format(parseISO(d.decided_on), "d.M.")}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <button
          type="button"
          onClick={onOpen}
          aria-current={selected ? "true" : undefined}
          className="rounded-sm text-left text-[14.5px] leading-snug font-medium after:absolute after:inset-0 md:text-[14px]"
        >
          {d.title}
        </button>
        {d.reason && <p className="line-clamp-2 text-[13px] leading-normal text-fg-2">{d.reason}</p>}
        {(people.length > 0 || area || d.target_type) && (
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-fg-2">
            {people.length > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="flex -space-x-1.5">
                  {people.map((p) => (
                    <span key={p.id} className="rounded-full shadow-[0_0_0_2px_var(--card)]">
                      <Avatar person={p} size={20} />
                    </span>
                  ))}
                </span>
                <span className="sr-only">Entschieden von {people.map((p) => p.name).join(", ")}</span>
              </span>
            )}
            {area && (
              <span className="inline-flex items-center gap-1.5">
                <span className="size-[7px] rounded-full" style={{ background: area.color }} aria-hidden />
                {area.name}
              </span>
            )}
            {d.target_type && (
              <span className="inline-flex min-w-0 items-center gap-1 rounded-full px-2 py-0.5 shadow-[inset_0_0_0_1px_var(--line2)]">
                <span className="text-fg-3">{TARGET_NAMES[d.target_type]}</span>
                <span className="truncate">{topic ? topic.label.trim() : "nicht mehr vorhanden"}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
