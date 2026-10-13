"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Daten der Übersicht: Meilensteine, Pipeline (nur was für Zähler und Nachfassen nötig ist), offene Aufgaben.
// Hört live mit: Jede Änderung im Team lädt die (kleinen) Listen neu.

export type Milestone = {
  id: string;
  parent_id: string | null;
  title: string;
  due_date: string;
  area_id: string;
  status: "offen" | "laeuft" | "erledigt" | "verzoegert";
  sort: number;
};

export type Org = {
  id: string;
  name: string;
  roles: ("challenge" | "sponsor" | "jury" | "tokens" | "venue")[];
  stage: "recherche" | "kontaktiert" | "im_gespraech" | "zugesagt" | "fix" | "abgesagt";
  next_follow_up: string | null;
  owner_id: string | null;
};

export type Task = {
  id: string;
  title: string;
  due_date: string | null;
  area_id: string | null;
  assignee_id: string | null;
  milestone_id: string | null;
};

export function useOverviewData() {
  const [data, setData] = useState<{ milestones: Milestone[]; orgs: Org[]; tasks: Task[] } | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [m, o, t] = await Promise.all([
      supabase.from("milestones").select("id, parent_id, title, due_date, area_id, status, sort").order("due_date").order("sort"),
      supabase.from("organizations").select("id, name, roles, stage, next_follow_up, owner_id"),
      supabase
        .from("tasks")
        .select("id, title, due_date, area_id, assignee_id, milestone_id")
        .neq("status", "erledigt")
        .not("due_date", "is", null),
    ]);
    setData({ milestones: m.data ?? [], orgs: o.data ?? [], tasks: t.data ?? [] });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Laden beim Öffnen der Seite
    load();
    const supabase = createClient();
    const channel = supabase.channel("overview");
    for (const table of ["milestones", "organizations", "tasks"]) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, load);
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  /** Meilenstein abhaken oder wieder öffnen. Sofort sichtbar, bei Fehler zurück. */
  const setMilestoneDone = useCallback(async (id: string, done: boolean) => {
    const status = done ? "erledigt" : "offen";
    let before: Milestone["status"] = "offen";
    setData((d) =>
      d && {
        ...d,
        milestones: d.milestones.map((m) => {
          if (m.id !== id) return m;
          before = m.status;
          return { ...m, status };
        }),
      }
    );
    const { error } = await createClient()
      .from("milestones")
      .update({ status, done_at: done ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) {
      setData((d) => d && { ...d, milestones: d.milestones.map((m) => (m.id === id ? { ...m, status: before } : m)) });
    }
    return !error;
  }, []);

  return { data, setMilestoneDone };
}
