"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/avatar";
import { Chip } from "@/components/chip";
import { Segmented } from "@/components/segmented";
import { useToast } from "@/components/toast";
import { PageHeader } from "@/components/app-shell/page-header";
import { useTeam } from "@/components/app-shell/team-provider";
import { MobileSheet } from "@/components/mobile-sheet";
import { KanbanBoard, KanbanCard, KanbanCards, KanbanHeader, KanbanProvider } from "@/components/ui/kanban";
import { useToday } from "@/lib/use-today";
import { useIsMobile } from "@/lib/use-is-mobile";
import { useOrganizations, type OrgPatch } from "@/lib/data/use-organizations";
import { logActivity } from "@/lib/data/use-feed";
import { formatShort } from "@/lib/dates";
import { FOLLOW_UP_ROUNDS } from "@/lib/phases";
import { play } from "@/lib/sounds";
import {
  followState,
  inTab,
  initials,
  STAGES,
  stageName,
  TABS,
  warmLine,
  type Organization,
  type Stage,
  type TabId,
} from "@/lib/pipeline";
import { NewOrgDialog } from "./new-org-dialog";
import { OrgCard } from "./org-card";
import { OrgDetail } from "./org-detail";
import { OrgTable } from "./org-table";

// Pipeline (Board „Graphit-Pipeline“), das Kernstück: Tabs je Typ, Zielbalken, Board mit Ziehen &
// Ablegen (nur Desktop) oder Liste, Detail rechts bzw. als Bottom Sheet. Zustand in der Adresse:
// ?tab=venues&firma=<id> (teilbar), ?neu=1 öffnet „+ Firma“.

type View = "board" | "list";

const PRIO_ORDER = { A: 0, B: 1, C: 2 } as const;

function sortOrgs(a: Organization, b: Organization) {
  const pa = a.prio ? PRIO_ORDER[a.prio] : 3;
  const pb = b.prio ? PRIO_ORDER[b.prio] : 3;
  if (pa !== pb) return pa - pb;
  const fa = a.next_follow_up ?? "9999";
  const fb = b.next_follow_up ?? "9999";
  if (fa !== fb) return fa.localeCompare(fb);
  return a.name.localeCompare(b.name, "de");
}

export function Pipeline() {
  const today = useToday();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const toast = useToast();
  const { me } = useTeam();
  const isMobile = useIsMobile();
  const { orgs, update, create } = useOrganizations();

  const [view, setView] = useState<View>("board");
  const [query, setQuery] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);

  const tab = (TABS.find((t) => t.id === params.get("tab"))?.id ?? "partner") as TabId;
  const selectedId = params.get("firma");
  const newOpen = params.get("neu") === "1";

  const setParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const tabDef = TABS.find((t) => t.id === tab)!;
  const all = useMemo(() => orgs ?? [], [orgs]);
  const selected = all.find((o) => o.id === selectedId) ?? null;

  // Direktlink auf eine Firma aus einem anderen Tab: passenden Tab öffnen.
  useEffect(() => {
    if (selected && !inTab(selected, tab)) {
      const own = TABS.find((t) => inTab(selected, t.id));
      if (own) setParams({ tab: own.id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur wenn sich die Auswahl ändert
  }, [selected?.id]);

  const inThisTab = all.filter((o) => inTab(o, tab));
  const q = query.trim().toLowerCase();
  const visible = inThisTab
    .filter((o) => !onlyMine || o.owner_id === me?.id)
    .filter((o) => !q || [o.name, o.warm_via, o.contact_person, o.notes, o.location].some((v) => v?.toLowerCase().includes(q)))
    .sort(sortOrgs);

  const won = inThisTab.filter((o) => tabDef.goalStages.includes(o.stage)).length;
  const dueToday = inThisTab.filter((o) => followState(o, today)?.tone === "today").length;
  const overdue = inThisTab.filter((o) => followState(o, today)?.tone === "red").length;
  const nextRound = FOLLOW_UP_ROUNDS.find((d) => d >= today);

  /** Stufe ändern: sofort speichern, 5 s „Rückgängig“, danach Eintrag im Verlauf. */
  const changeStage = (org: Organization, to: Stage) => {
    const from = org.stage;
    if (from === to) return;
    update(org.id, { stage: to });
    // Zusage ist ein Erfolg; von Fix zurück auf Zugesagt nicht.
    if (to === "fix" || (to === "zugesagt" && from !== "fix")) play("dealWon");
    toast({
      text: `${org.name} → ${stageName(to)}`,
      onAction: () => update(org.id, { stage: from }),
      onExpire: () => logActivity("organization", org.id, me?.id ?? null, "stage_changed", { from, to }),
    });
  };

  const patch = (org: Organization) => (p: OrgPatch) => update(org.id, p);
  const open = (id: string) => setParams({ firma: id });
  /** Klick auf die schon offene Firma schließt das Detail wieder. */
  const toggle = (id: string) => setParams({ firma: id === selectedId ? null : id });
  const close = () => setParams({ firma: null });

  if (!orgs || !today) {
    return (
      <>
        <PageHeader title="Pipeline" />
        <div className="m-3.5 h-[420px] rounded-xl bg-card-2 md:m-5" aria-busy="true" aria-label="Pipeline lädt" />
      </>
    );
  }

  const detail = selected && (
    <OrgDetail key={selected.id} org={selected} today={today} onUpdate={patch(selected)} onStage={(to) => changeStage(selected, to)} onClose={close} />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title="Pipeline" action={{ label: "Firma", onClick: () => setParams({ neu: "1" }) }}>
        <Segmented
          label="Ansicht"
          value={view}
          onChange={setView}
          options={[
            { value: "board", label: "Board" },
            { value: "list", label: "Liste" },
          ]}
        />
      </PageHeader>
      {/* Links Tabs, Filter und Inhalt; rechts das Detail über die volle Höhe unter der Kopfzeile (wie Linear/Attio) */}
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
      <h1 className="px-3.5 pt-2 pb-2 text-[21px] font-semibold tracking-[-0.025em] md:sr-only">Pipeline</h1>

      {/* Tabs, Suche, Filter */}
      <div className="flex flex-wrap items-center gap-2.5 px-3.5 pb-2.5 md:border-b md:border-line md:px-[18px] md:py-3">
        <div className="-mx-3.5 w-[calc(100%+28px)] overflow-x-auto px-3.5 md:mx-0 md:w-auto md:px-0">
          <Segmented
            label="Typ"
            value={tab}
            onChange={(t) => setParams({ tab: t, firma: null })}
            options={TABS.map((t) => ({
              value: t.id,
              label: (
                <>
                  <span className="md:hidden">{t.short}</span>
                  <span className="max-md:hidden">{t.name}</span> <span className="text-fg-3 tabular">{all.filter((o) => inTab(o, t.id)).length}</span>
                </>
              ),
            }))}
          />
        </div>
        <label className="relative flex min-w-0 flex-1 items-center md:max-w-[240px]">
          <Search className="pointer-events-none absolute left-2.5 size-3.5 text-fg-3" aria-hidden />
          <span className="sr-only">Suchen</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suchen …"
            className="h-8 w-full rounded-[9px] border border-field bg-card pr-2.5 pl-8 text-[13px] text-fg placeholder:text-fg-3 focus-visible:outline-solid"
          />
        </label>
        <button
          type="button"
          aria-pressed={onlyMine}
          onClick={() => setOnlyMine((v) => !v)}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-[9px] px-3 text-[13px] font-medium shadow-[inset_0_0_0_1px_var(--line2)] transition-colors duration-150",
            onlyMine ? "bg-active text-fg" : "text-fg-2 hover:bg-hover hover:text-fg"
          )}
        >
          Nur meine
        </button>
        <button
          type="button"
          onClick={() => setParams({ neu: "1" })}
          className="inline-flex h-8 items-center rounded-[9px] bg-acc px-3 text-[13px] font-medium text-acc-text md:hidden"
        >
          + Firma
        </button>
      </div>

      {/* Ziel und Zähler */}
      <div className="flex flex-wrap items-center gap-x-[22px] gap-y-2 px-3.5 pb-3 text-[13px] text-fg-2 md:border-b md:border-line md:px-[18px] md:py-3">
        <span className="flex items-center gap-2.5">
          {tabDef.goalLabel}
          {tabDef.goal && (
            <span className="flex gap-[3px]" aria-hidden>
              {Array.from({ length: tabDef.goal }, (_, i) => (
                <span key={i} className={cn("h-[5px] w-[22px] rounded-[3px]", i < won ? "bg-acc-line" : "bg-line-2")} />
              ))}
            </span>
          )}
          <b className="font-semibold text-fg tabular">
            {won}
            {tabDef.goal ? ` / ${tabDef.goal}` : ""}
          </b>
          {tabDef.goal ? (tab === "venues" ? "plus Backup" : "zugesagt") : "zugesagt · Ziel offen"}
        </span>
        {(dueToday > 0 || overdue > 0) && (
          <span className="flex gap-1.5">
            {dueToday > 0 && <Chip tone="today">{dueToday} heute</Chip>}
            {overdue > 0 && <Chip tone="red">{overdue} überfällig</Chip>}
          </span>
        )}
        {nextRound && <span className="md:ml-auto">Nächste Runde: {formatShort(nextRound)}</span>}
      </div>

      {inThisTab.length === 0 ? (
        <EmptyTab tabName={tabDef.name} onNew={() => setParams({ neu: "1" })} />
      ) : (
          <div className="min-h-0 min-w-0 flex-1 md:overflow-auto">
            {view === "board" && (
              <div className="hidden p-3.5 pb-5 md:block">
                <KanbanProvider
                  columns={STAGES.map((s) => ({ id: s.id, name: s.name }))}
                  data={visible.map((o) => ({ id: o.id, name: o.name, column: o.stage }))}
                  onMove={(id, to) => {
                    const org = all.find((o) => o.id === id);
                    if (org) changeStage(org, to as Stage);
                  }}
                  className="min-h-[calc(100dvh-250px)] min-w-[1010px]"
                >
                  {(col) => {
                    const st = STAGES.find((s) => s.id === col.id)!;
                    const count = visible.filter((o) => o.stage === st.id).length;
                    return (
                      <KanbanBoard key={col.id} id={col.id} className={st.id === "abgesagt" ? "max-w-[240px] min-w-[176px] flex-[0.8]" : "max-w-[300px] min-w-[208px] flex-1"}>
                        <KanbanHeader>
                          <span className={cn("size-2 rounded-full", st.dot)} aria-hidden />
                          <span className="text-[12.5px] font-semibold whitespace-nowrap">{st.name}</span>
                          <span className="text-[12px] text-fg-3 tabular">{count}</span>
                        </KanbanHeader>
                        <KanbanCards<{ id: string; name: string; column: string }>
                          id={col.id}
                          className="flex-1"
                          empty={
                            <div className="flex min-h-[70px] items-center justify-center rounded-[10px] border border-dashed border-line-2 p-2 text-center text-[12px] text-fg-3">
                              Noch leer
                            </div>
                          }
                        >
                          {(item) => {
                            const org = all.find((o) => o.id === item.id)!;
                            return (
                              <KanbanCard key={item.id} id={item.id}>
                                <OrgCard org={org} today={today} selected={org.id === selectedId} onOpen={() => toggle(org.id)} />
                              </KanbanCard>
                            );
                          }}
                        </KanbanCards>
                      </KanbanBoard>
                    );
                  }}
                </KanbanProvider>
              </div>
            )}
            {view === "list" && visible.length > 0 && (
              <div className="hidden h-full md:block">
                <OrgTable orgs={visible} today={today} venue={tab === "venues"} selectedId={selectedId} onOpen={toggle} />
              </div>
            )}
            {/* Handy: immer die Liste (Tabellen sind dort zu eng) */}
            <div className="md:hidden">
              <OrgList orgs={visible} today={today} selectedId={selectedId} onOpen={open} />
            </div>
            {visible.length === 0 && <p className="px-5 py-8 text-center text-[13.5px] text-fg-2">Keine Treffer.</p>}
          </div>
      )}
        </div>

        {/* Detail: Desktop rechts, Handy als Bottom Sheet */}
        {selected && !isMobile && (
          <aside aria-label="Firmen-Detail" className="w-[400px] shrink-0 overflow-y-auto border-l border-line bg-card">
            {detail}
          </aside>
        )}
      </div>

      <MobileSheet open={!!selected && isMobile} onClose={close} title={selected?.name ?? ""}>
        {detail}
      </MobileSheet>

      <NewOrgDialog
        open={newOpen}
        onOpenChange={(o) => !o && setParams({ neu: null })}
        defaultRole={tabDef.roles[0]}
        existing={all}
        onOpenExisting={open}
        onCreate={async (input) => {
          const org = await create({ ...input, stage: "recherche", created_by: me?.id ?? null });
          if (!org) return false;
          logActivity("organization", org.id, me?.id ?? null, "created");
          setParams({ neu: null, firma: org.id, tab: TABS.find((t) => inTab(org, t.id))?.id ?? tab });
          return true;
        }}
      />

    </div>
  );
}

// ---------------------------------------------------------------
// Liste fürs Handy (am Desktop zeigt „Liste“ die Tabelle in org-table.tsx)
// ---------------------------------------------------------------
function OrgList({ orgs, today, selectedId, onOpen }: { orgs: Organization[]; today: string; selectedId: string | null; onOpen: (id: string) => void }) {
  const { personById } = useTeam();
  return (
    <div className="flex flex-col gap-4 px-3.5 pb-8 md:px-[18px] md:py-4">
      {STAGES.map((st) => {
        const items = orgs.filter((o) => o.stage === st.id);
        if (!items.length) return null;
        return (
          <section key={st.id} className="flex flex-col gap-2">
            <h2 className="flex items-center gap-2 px-1 text-[12.5px] font-semibold">
              <span className={cn("size-2 rounded-full", st.dot)} aria-hidden />
              {st.name}
              <span className="font-normal text-fg-3 tabular">{items.length}</span>
            </h2>
            <ul className="overflow-hidden rounded-xl bg-card shadow-card">
              {items.map((o) => {
                const follow = followState(o, today);
                return (
                  <li key={o.id} className="border-t border-line first:border-t-0">
                    <button
                      type="button"
                      onClick={() => onOpen(o.id)}
                      aria-current={o.id === selectedId ? "true" : undefined}
                      className={cn(
                        "flex min-h-14 w-full items-center gap-3 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-hover md:min-h-11",
                        o.id === selectedId && "bg-active"
                      )}
                    >
                      <span className="grid size-7 shrink-0 place-items-center rounded-md bg-active text-[10.5px] font-semibold text-fg-2" aria-hidden>
                        {initials(o.name)}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5 md:flex-row md:items-center md:gap-3">
                        <span className="truncate text-[14px] font-medium md:w-[240px] md:shrink-0 md:text-[13.5px]">{o.name}</span>
                        {warmLine(o) && <span className="truncate text-[12.5px] text-fg-2">{warmLine(o)}</span>}
                      </span>
                      {o.prio && (
                        <span className="rounded-[5px] px-[5px] py-px font-mono text-[10.5px] font-medium text-fg-2 shadow-[inset_0_0_0_1px_var(--line2)]">
                          <span className="sr-only">Prio </span>
                          {o.prio}
                        </span>
                      )}
                      {follow && (
                        <Chip tone={follow.tone} className="max-sm:hidden">
                          {follow.label}
                        </Chip>
                      )}
                      {follow?.tone === "today" && <span className="size-2 rounded-full bg-acc sm:hidden" aria-label="heute nachfassen" />}
                      {follow?.tone === "red" && <span className="size-2 rounded-full bg-st-red sm:hidden" aria-label="überfällig" />}
                      <Avatar person={personById(o.owner_id)} size={22} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function EmptyTab({ tabName, onNew }: { tabName: string; onNew: () => void }) {
  return (
    <div className="m-3.5 flex flex-col items-center gap-2.5 rounded-[14px] bg-card-2 px-4 py-12 text-center md:m-5">
      <p className="text-sm font-medium">Noch keine Einträge bei {tabName}</p>
      <button type="button" onClick={onNew} className="mt-1 inline-flex h-8 items-center rounded-[9px] bg-acc px-3 text-[13px] font-medium text-acc-text">
        + Firma
      </button>
    </div>
  );
}
