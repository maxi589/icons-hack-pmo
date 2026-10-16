"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { play } from "@/lib/sounds";
import { celebrateMilestone } from "@/components/milestone-celebration";
import { useTeam } from "@/components/app-shell/team-provider";
import { logActivity } from "@/lib/data/use-feed";

// Alle Meilensteine (18, inkl. Unterpunkte) mit Live-Updates. Genutzt von Übersicht, Roadmap, Bereichen, Sidebar.
// Versionszähler wie in use-tasks.ts: eine ältere Antwort des Live-Neuladens überschreibt keine eigene Änderung.

export type MilestoneStatus = "offen" | "laeuft" | "erledigt" | "verzoegert";

export type Milestone = {
  id: string;
  parent_id: string | null;
  title: string;
  description: string | null;
  start_date: string | null;
  due_date: string;
  /** Ursprünglich geplantes Datum (Roadmap-Cockpit, 16.10.): daraus „verschoben +X T“ */
  baseline_due: string | null;
  area_id: string;
  status: MilestoneStatus;
  sort: number;
};

export type MilestonePatch = Partial<Pick<Milestone, "title" | "description" | "due_date">>;

export function useMilestones() {
  const { me } = useTeam();
  const [milestones, setMilestones] = useState<Milestone[] | null>(null);
  const version = useRef(0);
  const pending = useRef(0);
  // Mehrere Neuladevorgänge gleichzeitig (Änderung + Rückgängig): nur die Antwort des letzten zählt
  const seq = useRef(0);

  const load = useCallback(async () => {
    const v = version.current;
    const n = ++seq.current;
    const { data } = await createClient()
      .from("milestones")
      .select("id, parent_id, title, description, start_date, due_date, baseline_due, area_id, status, sort")
      .order("due_date")
      .order("sort");
    if (data && n === seq.current && pending.current === 0 && v === version.current) setMilestones(data);
  }, []);

  useEffect(() => {
    load();
    const supabase = createClient();
    const channel = supabase
      .channel(`milestones-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "milestones" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  /** Speichert sofort (optimistisch), bei Fehler zurück, aber nur die geänderten Felder (eine andere, gelungene
   *  Änderung bleibt stehen). `done_at` geht nur an die Datenbank. */
  const save = useCallback(async (id: string, shown: Partial<Milestone>, extra: { done_at?: string | null } = {}) => {
    let before: Partial<Milestone> | undefined;
    setMilestones(
      (list) =>
        list?.map((m) => {
          if (m.id !== id) return m;
          before = Object.fromEntries(Object.keys(shown).map((k) => [k, m[k as keyof Milestone]]));
          return { ...m, ...shown };
        }) ?? null
    );
    version.current++;
    pending.current++;
    const { error } = await createClient()
      .from("milestones")
      .update({ ...shown, ...extra })
      .eq("id", id);
    pending.current--;
    if (error && before) {
      const restore = before;
      setMilestones((list) => list?.map((m) => (m.id === id ? { ...m, ...restore } : m)) ?? null);
    }
    return !error;
  }, []);

  /** Meilenstein abhaken oder wieder öffnen; steht danach im Verlauf (Roadmap-Cockpit, 16.10.). */
  const setMilestoneDone = useCallback(
    async (id: string, done: boolean) => {
      const target = milestones?.find((m) => m.id === id);
      if (!target || (target.status === "erledigt") === done) return true;
      // Unterpunkt = Haken-Ton, ganzer Meilenstein = Wow-Moment mit Jingle.
      if (done) {
        if (target.parent_id) play("taskDone");
        else celebrateMilestone(target);
      }
      const to = done ? "erledigt" : "offen";
      const ok = await save(id, { status: to }, { done_at: done ? new Date().toISOString() : null });
      if (ok) logActivity("milestone", id, me?.id ?? null, "status_changed", { from: target.status, to });
      return ok;
    },
    [milestones, save, me]
  );

  /** Datum, Titel oder Beschreibung ändern. Den Verlauf schreibt der Aufrufer (Datum erst nach der „Rückgängig“-Zeit). */
  const updateMilestone = useCallback((id: string, patch: MilestonePatch) => save(id, patch), [save]);

  return { milestones, setMilestoneDone, updateMilestone };
}
