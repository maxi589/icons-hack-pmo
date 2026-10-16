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

export type MilestonePatch = Partial<Pick<Milestone, "title" | "description" | "due_date" | "area_id" | "start_date">>;

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

  /** Datum, Titel, Beschreibung, Bereich oder Beginn ändern. Den Verlauf schreibt der Aufrufer (nach der „Rückgängig“-Zeit). */
  const updateMilestone = useCallback((id: string, patch: MilestonePatch) => save(id, patch), [save]);

  // ---- Roadmap pflegen (Maxi, 16.10., Punkt 5): anlegen, löschen, Löschen rückgängig ----

  /** Neuer Meilenstein bzw. Unterpunkt (Nummer: nextMilestoneId). „conflict“ = Nummer inzwischen vergeben (zwei
   *  Personen gleichzeitig), dann mit der nächsten nochmal versuchen. Bei Fehlern lädt die Liste neu statt zu raten. */
  const createMilestone = useCallback(
    async (row: NewMilestone): Promise<"ok" | "conflict" | "error"> => {
      const full = { ...row, description: null, start_date: null, baseline_due: row.due_date, status: "offen" as MilestoneStatus };
      version.current++;
      pending.current++;
      setMilestones((list) => [...(list ?? []), full].sort((a, b) => a.due_date.localeCompare(b.due_date) || a.sort - b.sort));
      const { error } = await createClient().from("milestones").insert(full);
      pending.current--;
      if (!error) return "ok";
      await load();
      return error.code === "23505" ? "conflict" : "error";
    },
    [load]
  );

  /**
   * Löschen; liefert die gelöschte Zeile (alle Spalten) und die Aufgaben, die daran hingen (die Datenbank setzt deren
   * Meilenstein auf leer), damit „Rückgängig“ beides zurückholen kann. Unterpunkte prüft die Datenbank selbst, nicht
   * nur die Anzeige (sonst löschte „on delete cascade“ einen inzwischen angelegten Unterpunkt still mit, Prüfer 16.10.).
   */
  const deleteMilestone = useCallback(
    async (id: string): Promise<{ row: Record<string, unknown>; taskIds: string[] } | { blocked: string[] } | null> => {
      const supabase = createClient();
      const [{ data: subs, error: subError }, { data: linked, error: taskError }] = await Promise.all([
        supabase.from("milestones").select("id").eq("parent_id", id),
        supabase.from("tasks").select("id").eq("milestone_id", id),
      ]);
      if (subError || taskError) return null;
      if (subs?.length) return { blocked: subs.map((s) => s.id as string) };
      version.current++;
      pending.current++;
      setMilestones((list) => list?.filter((m) => m.id !== id) ?? null);
      const { data, error } = await supabase.from("milestones").delete().eq("id", id).select("*");
      pending.current--;
      if (error || !data?.length) {
        await load();
        return null;
      }
      return { row: data[0] as Record<string, unknown>, taskIds: (linked ?? []).map((t) => t.id as string) };
    },
    [load]
  );

  /** „Rückgängig“ nach dem Löschen: gleiche Zeile mit gleicher Nummer zurück, Aufgaben wieder verknüpfen.
   *  „partial“ = Meilenstein zurück, aber Aufgaben nicht wieder verknüpft. */
  const restoreMilestone = useCallback(
    async (deleted: { row: Record<string, unknown>; taskIds: string[] }): Promise<"ok" | "partial" | "error"> => {
      const supabase = createClient();
      version.current++;
      const { error } = await supabase.from("milestones").insert(deleted.row);
      if (error) return "error";
      let relinked = true;
      if (deleted.taskIds.length) {
        const { error: taskError } = await supabase.from("tasks").update({ milestone_id: deleted.row.id }).in("id", deleted.taskIds);
        relinked = !taskError;
      }
      await load();
      return relinked ? "ok" : "partial";
    },
    [load]
  );

  return { milestones, setMilestoneDone, updateMilestone, createMilestone, deleteMilestone, restoreMilestone };
}

export type NewMilestone = Pick<Milestone, "id" | "parent_id" | "title" | "due_date" | "area_id" | "sort">;

/** Nummern, die der Code fest kennt (Phasen, Plan-Balken, Welle 1, Ziel-Kacheln): nie neu vergeben. */
const RESERVED_IDS = ["M1", "M2", "M3", "M3.1", "M3.3", "M4", "M5", "M7", "M8"];

/**
 * Alle Nummern, an denen schon etwas hängt (Verlauf, Kommentare, Inbox, Dokumente), auch von gelöschten Meilensteinen.
 * Diese hängen nur über die Nummer am Meilenstein; eine wieder vergebene Nummer würde sie erben (Prüfer, 16.10.).
 */
export async function usedMilestoneIds() {
  const supabase = createClient();
  const rows = await Promise.all(
    ["activity", "comments", "notifications", "documents"].map((t) => supabase.from(t).select("target_id").eq("target_type", "milestone"))
  );
  return [...new Set([...RESERVED_IDS, ...rows.flatMap((r) => (r.data ?? []).map((x) => String(x.target_id)))])];
}

/**
 * Nächste freie Nummer (Maxi, 16.10.: Nummern sind Namen und bleiben, auch wenn sich das Datum ändert):
 * Hauptmeilenstein = höchste Nummer + 1 (M9), Unterpunkt = höchster Unterpunkt des Meilensteins + 1 (M3.5).
 * `used`: Nummern gelöschter Meilensteine und reservierte Nummern, damit keine Nummer zweimal vergeben wird.
 */
export function nextMilestoneId(list: Pick<Milestone, "id">[], parentId: string | null, used: string[] = []) {
  const ids = [...list.map((m) => m.id), ...used];
  const nums = (re: RegExp) =>
    ids
      .map((id) => id.match(re)?.[1])
      .filter((x): x is string => !!x)
      .map(Number);
  if (!parentId) return `M${Math.max(0, ...nums(/^M(\d+)$/)) + 1}`;
  const esc = parentId.replace(".", "\\.");
  return `${parentId}.${Math.max(0, ...nums(new RegExp(`^${esc}\\.(\\d+)$`))) + 1}`;
}
