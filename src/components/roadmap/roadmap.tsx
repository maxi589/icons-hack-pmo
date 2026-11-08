"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/avatar";
import { DueChip } from "@/components/chip";
import { MobileSheet } from "@/components/mobile-sheet";
import { useIsMobile } from "@/lib/use-is-mobile";
import { MobileTitle, PageHeader } from "@/components/app-shell/page-header";
import { useTeam } from "@/components/app-shell/team-provider";
import { useToday } from "@/lib/use-today";
import { nextMilestoneId, usedMilestoneIds, useMilestones, type Milestone } from "@/lib/data/use-milestones";
import { logActivity } from "@/lib/data/use-feed";
import { useToast } from "@/components/toast";
import { daysBetween, formatDayMonth, formatShort, relativeDays } from "@/lib/dates";
import { FOLLOW_UP_ROUNDS } from "@/lib/phases";
import { AXIS_DAYS, AXIS_END, axisEdge, axisPos, BREAKS, MONTHS, planBarsFor } from "@/lib/roadmap";
import { KEY } from "@/lib/key-milestones";
import { Segmented } from "@/components/segmented";
import { useTaskActions } from "@/components/tasks/use-task-actions";
import { useTasks } from "@/lib/data/use-tasks";
import type { Task } from "@/lib/tasks";
import { MilestoneDetail } from "./milestone-detail";
import { useMilestoneEdit } from "./use-milestone-edit";
import { NewMilestoneDialog, type NewMilestoneInput } from "./new-milestone-dialog";

// Roadmap (Board „Graphit-Roadmap“): Zeitstrahl je Bereich mit Rauten und Balken, darunter das
// Detail-Panel. Umschalter Zeitstrahl/Liste; am Handy nur die Liste. Auswahl steht in der Adresse (?m=M2).

type View = "timeline" | "list";

export function Roadmap() {
  const today = useToday();
  const { milestones, setMilestoneDone, updateMilestone, createMilestone, deleteMilestone, restoreMilestone } = useMilestones();
  const [view, setView] = useState<View>("timeline");
  const [picked, setPicked] = useState<string | null>(null);
  // Aufgaben einmal für die Seite (die Liste zeigt viele Karten; je Karte laden hieße je Karte ein Live-Kanal)
  const tasksApi = useTasks();
  const { toggleDone, createTask } = useTaskActions(tasksApi);
  const edit = useMilestoneEdit(updateMilestone);
  const { me, areaById } = useTeam();

  // Direktlink ?m=M2.1 (z. B. aus der Übersicht oder per WhatsApp): einmal beim Öffnen lesen.
  useEffect(() => {
    const m = new URLSearchParams(window.location.search).get("m");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Adresse ist erst im Browser bekannt
    if (m) setPicked(m);
  }, []);

  const select = (id: string) => {
    setPicked(id);
    window.history.replaceState(null, "", `?m=${id}`);
  };

  const isMobile = useIsMobile();
  const byId = (id: string | null) => milestones?.find((m) => m.id === id) ?? null;
  const sheetItem = byId(picked);
  const closeSheet = () => {
    setPicked(null);
    window.history.replaceState(null, "", "/roadmap");
  };
  const childrenOf = (id: string) => (milestones ?? []).filter((m) => m.parent_id === id).sort((a, b) => a.sort - b.sort);
  const tasksOf = (id: string) => (tasksApi.tasks ?? []).filter((t) => t.milestone_id === id);
  /** Jede Aktion im Detail hält die Auswahl fest: Ohne ?m= zeigt das Detail den ersten offenen Meilenstein, und nach einer
   *  Datumsänderung wäre das sonst plötzlich ein anderer (Prüfer, 16.10.). */
  const pin = (id: string) => picked !== id && select(id);
  /** Was jedes Cockpit braucht: Aufgaben, Abhaken, „+ Aufgabe“, Datum/Titel/Beschreibung ändern. */
  const cockpit = (m: Milestone) => ({
    tasks: tasksOf(m.id),
    onToggleTask: (t: Task) => {
      pin(m.id);
      toggleDone(t);
    },
    // „+ Aufgabe“ in der Zeile: Meilenstein, Bereich und dessen Verantwortliche/r vorbelegt (sonst du)
    onAddTask: async (title: string) => {
      pin(m.id);
      const assignee_id = areaById(m.area_id)?.owner_id ?? me?.id ?? null;
      return !!(await createTask({ title, milestone_id: m.id, area_id: m.area_id, assignee_id }, (id) => "/aufgaben?aufgabe=" + id));
    },
    onDate: (to: string) => {
      pin(m.id);
      edit.changeDate(m, to);
    },
    onText: (field: "title" | "description", value: string | null) => {
      pin(m.id);
      edit.changeText(m, field, value);
    },
    onArea: (to: string) => {
      pin(m.id);
      edit.changeArea(m, to, areaById(to)?.name ?? to);
    },
    onStart: (to: string) => {
      pin(m.id);
      edit.changeStart(m, to);
    },
    onDelete: () => removeMilestone(m),
  });

  // ---- Roadmap pflegen (Maxi, 16.10., Punkt 5) ----
  const toast = useToast();
  const [creating, setCreating] = useState(false);

  /** „+ Meilenstein“: Nummer vergibt das Tool (nie eine schon benutzte), danach steht das neue Cockpit offen;
   *  Rückgängig löscht wieder. Ist die Nummer inzwischen vergeben (zwei Personen gleichzeitig), nimmt es die nächste. */
  const addMilestone = async (input: NewMilestoneInput) => {
    const list = milestones ?? [];
    const used = await usedMilestoneIds();
    const sort = Math.max(0, ...list.map((x) => x.sort)) + 1;
    let id = "";
    for (let tries = 0; ; tries++) {
      id = nextMilestoneId(list, input.parent_id, used);
      const res = await createMilestone({ id, sort, ...input });
      if (res === "ok") break;
      if (res === "error" || tries >= 2) return false;
      used.push(id);
    }
    // Erst wenn der Dialog zu ist (sonst landet der Fokus am Handy hinter dem Sheet)
    setTimeout(() => select(id), 200);
    const meId = me?.id ?? null;
    let undone = false;
    toast({
      text: `${id} angelegt`,
      onAction: async () => {
        undone = true;
        const res = await deleteMilestone(id);
        if (!res || "blocked" in res) return toast({ text: `${id} nicht gelöscht. Bitte im Cockpit löschen.`, error: true });
        // Auswahl und Adresse nicht auf dem gelöschten Meilenstein stehen lassen
        setPicked((p) => (p === id ? null : p));
        if (new URLSearchParams(window.location.search).get("m") === id) window.history.replaceState(null, "", "/roadmap");
      },
      onExpire: () => !undone && logActivity("milestone", id, meId, "created"),
    });
    return true;
  };

  /** Löschen mit Rückgängig. Unterpunkte zuerst (die Datenbank prüft mit; sonst löschte „on delete cascade“ sie still
   *  mit); Aufgaben bleiben und verlieren nur die Verknüpfung, Rückgängig verknüpft sie wieder. Unterpunkte hinterlassen
   *  eine Spur im Verlauf des Oberpunkts. KEY.event (M9) ist das Event selbst (Countdown, Zeitachse) und bleibt. */
  const removeMilestone = async (m: Milestone) => {
    if (m.id === KEY.event) return toast({ text: `${KEY.event} ist der Hackathon selbst und bleibt.`, error: true });
    const deleted = await deleteMilestone(m.id);
    if (!deleted) return toast({ text: `${m.id} nicht gelöscht. Bitte nochmal versuchen.`, error: true });
    if ("blocked" in deleted) {
      return toast({ text: `${m.id} hat Unterpunkte (${deleted.blocked.join(", ")}). Bitte zuerst diese löschen.`, error: true });
    }
    if (picked === m.id) closeSheet();
    const n = deleted.taskIds.length;
    const meId = me?.id ?? null;
    let undone = false;
    toast({
      text: `${m.id} gelöscht${n ? ` · ${n} ${n === 1 ? "Aufgabe" : "Aufgaben"} ohne Meilenstein` : ""}`,
      onAction: async () => {
        undone = true;
        const res = await restoreMilestone(deleted);
        if (res === "error") return toast({ text: `${m.id} nicht zurückgeholt.`, error: true });
        select(m.id);
        if (res === "partial") toast({ text: `${m.id} ist zurück, die Aufgaben aber nicht wieder verknüpft.`, error: true });
      },
      onExpire: () => {
        if (!undone && m.parent_id) logActivity("milestone", m.parent_id, meId, "sub_deleted", { id: m.id, title: m.title });
      },
    });
  };
  const tops = (milestones ?? []).filter((m) => !m.parent_id);
  const selected = byId(picked) ?? tops.find((m) => m.status !== "erledigt") ?? tops[0] ?? null;
  // In der Liste stehen Unterpunkte in der Karte ihres Meilensteins.
  const listTarget = selected?.parent_id ?? selected?.id;

  // Link auf einen Meilenstein, den es nicht (mehr) gibt (gelöscht, alter WhatsApp-Link): sagen statt still einen
  // anderen zu zeigen; Auswahl und Adresse leeren.
  useEffect(() => {
    if (!milestones || !picked || milestones.some((m) => m.id === picked)) return;
    toast({ text: `${picked} gibt es nicht mehr.`, error: true });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Auswahl folgt den Live-Daten (Meilenstein verschwunden)
    closeSheet();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur wenn Liste oder Auswahl wechseln
  }, [milestones, picked]);

  // Nach dem Laden zum verlinkten Meilenstein scrollen (Liste am Handy).
  const ready = Boolean(milestones && today);
  useEffect(() => {
    if (!ready || !picked) return;
    const target = byId(picked);
    const el = document.getElementById(`ms-${target?.parent_id ?? picked}`);
    if (el && el.offsetParent !== null) el.scrollIntoView({ block: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur beim ersten fertigen Laden
  }, [ready]);

  return (
    <>
      <PageHeader title="Roadmap" action={{ label: "Meilenstein", onClick: () => milestones && setCreating(true) }}>
        <Segmented
          label="Ansicht"
          value={view}
          onChange={setView}
          options={[
            { value: "timeline", label: "Zeitstrahl" },
            { value: "list", label: "Liste" },
          ]}
        />
      </PageHeader>
      <MobileTitle title="Roadmap" action={{ label: "Meilenstein", onClick: () => milestones && setCreating(true) }} />
      <h1 className="sr-only max-md:hidden">Roadmap</h1>

      {!milestones || !today ? (
        <div className="mx-3.5 h-[420px] rounded-xl bg-card-2 md:mx-5 md:mt-5" aria-busy="true" aria-label="Roadmap lädt" />
      ) : (
        <>
          {/* Nicht am Handy rendern: sonst gäbe es das Detail (mit id="ms-…") doppelt neben dem Sheet */}
          {view === "timeline" && !isMobile && (
            <div className="hidden pt-1.5 pb-6 md:block">
              <Timeline milestones={milestones} today={today} selectedId={selected?.id ?? null} onSelect={select} />
              {selected && (
                <div data-detail className="px-5 pt-4">
                  {/* key: frisches Detail je Meilenstein (kein halber Kommentar oder Entwurf wandert mit) */}
                  <MilestoneDetail
                    key={selected.id}
                    {...cockpit(selected)}
                    milestone={selected}
                    subs={childrenOf(selected.id)}
                    parent={byId(selected.parent_id)}
                    today={today}
                    onToggle={(id, done) => {
                      pin(selected.id);
                      setMilestoneDone(id, done);
                    }}
                    onSelect={select}
                    feed="open"
                  />
                </div>
              )}
            </div>
          )}
          {/* Wie der Zeitstrahl nicht am Handy rendern (sonst gäbe es ms-…/cm-… doppelt neben dem Sheet) */}
          {view === "list" && !isMobile && (
            <div className="hidden flex-col gap-4 px-5 pt-5 pb-8 md:flex">
              <MilestoneList
                tops={tops}
                childrenOf={childrenOf}
                cockpit={cockpit}
                today={today}
                onToggle={setMilestoneDone}
                highlightId={picked ? listTarget : null}
              />
            </div>
          )}
          {/* Handy: kompakte Liste, Antippen öffnet das Detail als Sheet (15.10., vorher lange Karten) */}
          <div className="flex flex-col gap-3 px-3.5 pb-8 md:hidden">
            <CompactList tops={tops} childrenOf={childrenOf} today={today} onOpen={select} />
          </div>
        </>
      )}

      {isMobile && sheetItem && today && (
        <MobileSheet open onClose={closeSheet} title={`${sheetItem.id} ${sheetItem.title}`}>
          <MilestoneDetail
            key={sheetItem.id}
            {...cockpit(sheetItem)}
            feed="open"
            milestone={sheetItem}
            subs={childrenOf(sheetItem.id)}
            parent={byId(sheetItem.parent_id)}
            today={today}
            onToggle={setMilestoneDone}
            onSelect={select}
            onClose={closeSheet}
          />
        </MobileSheet>
      )}

      <NewMilestoneDialog open={creating} onOpenChange={setCreating} milestones={milestones ?? []} onCreate={addMilestone} />
    </>
  );
}

// ---------------------------------------------------------------
// Handy: Meilensteine als Zeilen nach Monat. Unterpunkte stecken im Detail; steht einer früher an als sein
// Meilenstein, zeigt die Zeile ihn darunter („als Nächstes M2.1 · Mo, 19.10.“), damit nichts übersehen wird.
// ---------------------------------------------------------------
function CompactList({
  tops,
  childrenOf,
  today,
  onOpen,
}: {
  tops: Milestone[];
  childrenOf: (id: string) => Milestone[];
  today: string;
  onOpen: (id: string) => void;
}) {
  const { areaById } = useTeam();
  const monthOf = (d: string) => MONTHS.find((mo) => d.slice(0, 7) === mo.start.slice(0, 7))?.name ?? d.slice(0, 7);
  const groups = [...new Set(tops.map((m) => monthOf(m.due_date)))];

  return (
    <>
      {groups.map((g) => (
        <section key={g} className="flex flex-col gap-1.5">
          <h2 className="label-mono px-1 pt-1">{g}</h2>
          <ul className="overflow-hidden rounded-xl bg-card shadow-card">
            {tops
              .filter((m) => monthOf(m.due_date) === g)
              .map((m) => {
                const area = areaById(m.area_id);
                const subs = childrenOf(m.id);
                const subsDone = subs.filter((s) => s.status === "erledigt").length;
                const done = m.status === "erledigt";
                const next = done ? undefined : subs.find((s) => s.status !== "erledigt" && s.due_date < m.due_date);
                const urgent = !done && daysBetween(today, m.due_date) <= 7;
                return (
                  <li key={m.id} className={cn("relative flex items-start gap-3 border-t border-line px-3.5 py-2.5 first:border-t-0", done && "opacity-60")}>
                    <span
                      className={cn("mt-[6px] size-[11px] shrink-0 rotate-45 rounded-[2px]", done ? "" : "border-[1.5px]")}
                      style={done ? { background: area?.color } : { borderColor: area?.color }}
                      aria-hidden
                    />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => onOpen(m.id)}
                        className="min-w-0 truncate rounded-sm text-left text-[15px] font-medium after:absolute after:inset-0"
                      >
                        <span className="font-mono text-[12.5px] font-normal text-fg-3">{m.id} </span>
                        {m.title}
                        {done && <span className="sr-only">, erledigt</span>}
                      </button>
                      <span className="truncate text-[12.5px] text-fg-3 tabular">
                        {formatShort(m.due_date)} · {area?.name}
                        {subs.length > 0 && ` · ${subsDone}/${subs.length}`}
                      </span>
                      {next && (
                        <span className="truncate text-[12.5px] text-fg-2 tabular">
                          {/* Nah oder überfällig: Wort statt nur Farbe („in 4 Tagen“, „überfällig“) */}
                          {daysBetween(today, next.due_date) < 0 ? (
                            <span className="text-st-red">überfällig</span>
                          ) : daysBetween(today, next.due_date) <= 7 ? (
                            <span className="text-st-amber">{relativeDays(next.due_date, today)}</span>
                          ) : (
                            formatShort(next.due_date)
                          )}{" "}
                          · {next.id} {next.title}
                        </span>
                      )}
                    </span>
                    {done ? (
                      <Check className="mt-0.5 size-4 shrink-0 text-acc-line" strokeWidth={2.4} aria-hidden />
                    ) : (
                      urgent && <DueChip due={m.due_date} today={today} />
                    )}
                  </li>
                );
              })}
          </ul>
          <BreakNote month={g} monthOf={monthOf} />
        </section>
      ))}
    </>
  );
}

// ---------------------------------------------------------------
// Zeitstrahl
// ---------------------------------------------------------------
type Placed = Milestone & { x: number; place: "up" | "down"; anchorRight: boolean };

/** Beschriftungen in einer Zeile abwechselnd oben/unten, wenn Rauten eng beieinander liegen. */
function placeLabels(items: Milestone[]): Placed[] {
  const out: Placed[] = [];
  for (const m of items) {
    const x = axisPos(m.due_date);
    const prev = out[out.length - 1];
    const place = prev && x - prev.x < 9 ? (prev.place === "up" ? "down" : "up") : "up";
    out.push({ ...m, x, place, anchorRight: x > 88 });
  }
  return out;
}

function Timeline({
  milestones,
  today,
  selectedId,
  onSelect,
}: {
  milestones: Milestone[];
  today: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { allAreas, personById } = useTeam();
  const parentDue = (m: Milestone) => milestones.find((p) => p.id === m.parent_id)?.due_date;
  // Unterpunkte bis 3 Tage vor ihrem Meilenstein (M1.1–M1.4, M8.1) würden dessen Raute verdecken: nur im Detail zeigen.
  const visible = milestones.filter((m) => {
    const due = parentDue(m);
    return !m.parent_id || !due || daysBetween(m.due_date, due) > 3;
  });
  const todayOnAxis = daysBetween(MONTHS[0].start, today) >= 0 && daysBetween(today, AXIS_END) >= 0;

  return (
    <div className="mx-5 mt-3.5 overflow-x-auto rounded-xl shadow-[0_0_0_1px_var(--line)]">
      <div className="grid min-w-[980px] grid-cols-[196px_minmax(0,1fr)]">
        {/* Bereiche */}
        <div className="border-r border-line">
          <div className="label-mono flex h-10 items-center px-3.5">Bereich</div>
          {allAreas.map((a) => {
            const owner = personById(a.owner_id);
            return (
              <div key={a.id} className="flex h-[58px] items-center gap-2.5 border-t border-line px-3.5">
                <span className="size-2 shrink-0 rounded-full" style={{ background: a.color }} aria-hidden />
                <span className="flex-1 truncate text-[13px]">{a.name}</span>
                <Avatar person={owner} size={20} title={owner ? `Verantwortlich: ${owner.name}` : "Verantwortlich offen"} />
              </div>
            );
          })}
        </div>

        {/* Achse */}
        <div className="relative">
          <div className="flex h-10">
            {MONTHS.map((mo) => (
              <div
                key={mo.name}
                className="flex items-end border-l border-line px-2.5 pb-1.5 text-[12px] text-fg-2"
                style={{ width: `${(mo.days / AXIS_DAYS) * 100}%` }}
              >
                {mo.name}
              </div>
            ))}
          </div>

          {/* Pausen (Weihnachten): schraffiert hinter den Zeilen, Erklärung in der Legende */}
          {BREAKS.map((b) => (
            <div
              key={b.label}
              aria-hidden
              className="pointer-events-none absolute top-10 bottom-0"
              style={{ left: `${axisEdge(b.from)}%`, width: `${axisEdge(b.to) - axisEdge(b.from) + 100 / AXIS_DAYS}%`, background: BREAK_FILL }}
            />
          ))}

          {allAreas.map((a) => {
            const items = placeLabels(visible.filter((m) => m.area_id === a.id).sort((x, y) => x.due_date.localeCompare(y.due_date)));
            const bars = [
              ...milestones
                .filter((m) => m.area_id === a.id && m.start_date)
                .map((m) => ({ key: m.id, from: m.start_date!, to: m.due_date, label: `${m.id} · ${m.title}`, faint: false })),
              ...planBarsFor(milestones).filter((b) => b.areaId === a.id).map((b) => ({ ...b, key: b.label })),
            ];
            return (
              <div key={a.id} className="relative h-[58px] border-t border-line">
                {bars.map((b) => (
                  <div
                    key={b.key}
                    title={`${b.label} (${formatDayMonth(b.from)}–${formatDayMonth(b.to)})`}
                    className="absolute top-6 h-2.5 rounded-[5px]"
                    style={{
                      left: `${axisEdge(b.from)}%`,
                      width: `${axisEdge(b.to) - axisEdge(b.from) + 100 / AXIS_DAYS}%`,
                      background: `color-mix(in srgb, ${a.color} ${b.faint ? 16 : 30}%, transparent)`,
                    }}
                  />
                ))}
                {items.map((m) => {
                  const on = m.id === selectedId;
                  const done = m.status === "erledigt";
                  const late = !done && m.due_date < today;
                  const label = m.parent_id ? m.id : `${m.id} · ${formatDayMonth(m.due_date)}`;
                  return (
                    <div key={m.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(m.id)}
                        aria-pressed={on}
                        aria-label={`${m.id} ${m.title}, fällig ${formatDayMonth(m.due_date)}${done ? ", erledigt" : late ? ", überfällig" : ""}`}
                        className={cn(
                          "absolute top-[22px] -ml-[7px] size-3.5 rotate-45 rounded-[3px] transition-[scale] duration-150 ease-out hover:scale-125",
                          done && !on && "opacity-40"
                        )}
                        style={{
                          left: `${m.x}%`,
                          background: on ? "var(--text)" : a.color,
                          boxShadow: on ? `0 0 0 3px var(--panel), 0 0 0 5px ${a.color}` : "0 0 0 3px var(--panel)",
                        }}
                      />
                      <span
                        aria-hidden
                        className={cn(
                          "pointer-events-none absolute text-[11.5px] font-medium whitespace-nowrap",
                          m.place === "up" ? "top-1" : "top-10",
                          m.anchorRight ? "-translate-x-full pr-3" : "-translate-x-1/2",
                          on ? "text-fg" : late ? "text-st-red" : "text-fg-2",
                          done && "text-fg-3 line-through"
                        )}
                        style={{ left: `${m.x}%` }}
                      >
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Gitter, Nachfass-Runden, Heute */}
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            {MONTHS.slice(1).map((mo) => (
              <div key={mo.name} className="absolute top-10 bottom-0 border-l border-line" style={{ left: `${axisEdge(mo.start)}%` }} />
            ))}
            {FOLLOW_UP_ROUNDS.map((d) => (
              <div key={d}>
                <div className="absolute top-10 bottom-0 border-l-[1.5px] border-dashed border-fg-3 opacity-55" style={{ left: `${axisPos(d)}%` }} />
                <div
                  className="absolute top-1 -translate-x-1/2 bg-panel px-1 font-mono text-[10.5px] whitespace-nowrap text-fg-3"
                  style={{ left: `${axisPos(d)}%` }}
                >
                  {formatDayMonth(d)}
                </div>
              </div>
            ))}
            {todayOnAxis && (
              <>
                <div className="absolute top-[30px] bottom-0 -ml-px w-0.5 bg-acc-line" style={{ left: `${axisPos(today)}%` }} />
                <div className="absolute top-5 size-2 -translate-x-1/2 rounded-full bg-acc-line" style={{ left: `${axisPos(today)}%` }} />
              </>
            )}
          </div>
        </div>
      </div>
      <TimelineLegend />
    </div>
  );
}

/** Schraffur für Pausen: dünne Linien plus leichte Fläche, in hell und dunkel aus --text3. */
const BREAK_FILL =
  "repeating-linear-gradient(135deg, color-mix(in srgb, var(--text3) 24%, transparent) 0 1px, transparent 1px 6px), color-mix(in srgb, var(--text3) 7%, transparent)";

function TimelineLegend() {
  return (
    <div className="flex min-w-[980px] flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-line px-3.5 py-2.5 text-[12px] text-fg-2">
      {BREAKS.map((b) => (
        <span key={b.label} className="inline-flex items-center gap-2">
          <span className="h-3 w-5 shrink-0 rounded-[3px] shadow-[inset_0_0_0_1px_var(--line2)]" style={{ background: BREAK_FILL }} aria-hidden />
          <span>
            <span className="font-medium text-fg">{b.label}</span> {formatDayMonth(b.from)}–{formatDayMonth(b.to)} · {b.note}
          </span>
        </span>
      ))}
      <span className="inline-flex items-center gap-2">
        <span className="h-3 w-0 border-l-[1.5px] border-dashed border-fg-3" aria-hidden />
        Nachfass-Runde
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="h-3 w-0.5 bg-acc-line" aria-hidden />
        Heute
      </span>
    </div>
  );
}

/** Hinweis zwischen den Monaten der Liste, z. B. nach Dezember: „Weihnachtspause 19.12.–10.1. · Outreach schwer“. */
function BreakNote({ month, monthOf }: { month: string; monthOf: (d: string) => string }) {
  const hits = BREAKS.filter((b) => monthOf(b.from) === month);
  if (!hits.length) return null;
  return (
    <>
      {hits.map((b) => (
        <p
          key={b.label}
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12.5px] text-fg-2 shadow-[inset_0_0_0_1px_var(--line)]"
          style={{ background: BREAK_FILL }}
        >
          <span className="font-medium text-fg">{b.label}</span>
          <span className="tabular">
            {formatDayMonth(b.from)}–{formatDayMonth(b.to)}
          </span>
          <span>· {b.note}</span>
        </p>
      ))}
    </>
  );
}

// ---------------------------------------------------------------
// Liste (Handy und Umschalter „Liste“): Meilensteine nach Monat
// ---------------------------------------------------------------
function MilestoneList({
  tops,
  childrenOf,
  cockpit,
  today,
  onToggle,
  highlightId,
}: {
  tops: Milestone[];
  childrenOf: (id: string) => Milestone[];
  cockpit: (m: Milestone) => Omit<React.ComponentProps<typeof MilestoneDetail>, "milestone" | "subs" | "parent" | "today" | "onToggle">;
  today: string;
  onToggle: (id: string, done: boolean) => void;
  highlightId: string | null | undefined;
}) {
  const monthOf = (d: string) => MONTHS.find((mo) => d.slice(0, 7) === mo.start.slice(0, 7))?.name ?? d.slice(0, 7);
  const groups = [...new Set(tops.map((m) => monthOf(m.due_date)))];

  return (
    <>
      {groups.map((g) => (
        <section key={g} className="flex flex-col gap-3 md:gap-4">
          <h2 className="label-mono pt-2">{g}</h2>
          {tops
            .filter((m) => monthOf(m.due_date) === g)
            .map((m) => (
              <MilestoneDetail
                key={m.id}
                {...cockpit(m)}
                as="article"
                milestone={m}
                subs={childrenOf(m.id)}
                parent={null}
                today={today}
                onToggle={onToggle}
                highlighted={m.id === highlightId}
              />
            ))}
          <BreakNote month={g} monthOf={monthOf} />
        </section>
      ))}
    </>
  );
}
