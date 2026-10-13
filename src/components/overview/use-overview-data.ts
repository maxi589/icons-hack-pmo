"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useMilestones } from "@/lib/data/use-milestones";

// Daten der Übersicht: Meilensteine (geteilt mit der Roadmap), Pipeline (nur was für Zähler und
// Nachfassen nötig ist) und offene Aufgaben mit Frist. Alles mit Live-Updates.

export type { Milestone } from "@/lib/data/use-milestones";

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
  const { milestones, setMilestoneDone } = useMilestones();
  const [rest, setRest] = useState<{ orgs: Org[]; tasks: Task[] } | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [o, t] = await Promise.all([
      supabase.from("organizations").select("id, name, roles, stage, next_follow_up, owner_id"),
      supabase
        .from("tasks")
        .select("id, title, due_date, area_id, assignee_id, milestone_id")
        .neq("status", "erledigt")
        .not("due_date", "is", null),
    ]);
    setRest({ orgs: o.data ?? [], tasks: t.data ?? [] });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Laden beim Öffnen der Seite
    load();
    const supabase = createClient();
    const channel = supabase.channel(`overview-${Math.random().toString(36).slice(2)}`);
    for (const table of ["organizations", "tasks"]) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, load);
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const data = milestones && rest ? { milestones, ...rest } : null;
  return { data, setMilestoneDone };
}
