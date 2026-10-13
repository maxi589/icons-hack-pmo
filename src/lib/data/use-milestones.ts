"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Alle Meilensteine (18, inkl. Unterpunkte) mit Live-Updates. Genutzt von Übersicht und Roadmap.

export type MilestoneStatus = "offen" | "laeuft" | "erledigt" | "verzoegert";

export type Milestone = {
  id: string;
  parent_id: string | null;
  title: string;
  description: string | null;
  start_date: string | null;
  due_date: string;
  area_id: string;
  status: MilestoneStatus;
  sort: number;
};

export function useMilestones() {
  const [milestones, setMilestones] = useState<Milestone[] | null>(null);

  const load = useCallback(async () => {
    const { data } = await createClient()
      .from("milestones")
      .select("id, parent_id, title, description, start_date, due_date, area_id, status, sort")
      .order("due_date")
      .order("sort");
    if (data) setMilestones(data);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Laden beim Öffnen der Seite
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

  /** Meilenstein abhaken oder wieder öffnen. Sofort sichtbar, bei Fehler zurück. */
  const setMilestoneDone = useCallback(async (id: string, done: boolean) => {
    const status: MilestoneStatus = done ? "erledigt" : "offen";
    let before: MilestoneStatus = "offen";
    setMilestones((list) =>
      list?.map((m) => {
        if (m.id !== id) return m;
        before = m.status;
        return { ...m, status };
      }) ?? null
    );
    const { error } = await createClient()
      .from("milestones")
      .update({ status, done_at: done ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) setMilestones((list) => list?.map((m) => (m.id === id ? { ...m, status: before } : m)) ?? null);
    return !error;
  }, []);

  return { milestones, setMilestoneDone };
}
