"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Lädt einmal pro Sitzung die angemeldete Person und die Bereiche für Sidebar und Handy-Menü.
// Der App-Rahmen bleibt beim Seitenwechsel stehen, deshalb wird nicht bei jedem Klick neu geladen.

export type Person = { id: string; name: string; initials: string; color: string };
export type Area = { id: string; name: string; color: string; owner_id: string | null };

type Team = { me: Person | null; areas: Area[] };

const TeamContext = createContext<Team>({ me: null, areas: [] });

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const [team, setTeam] = useState<Team>({ me: null, areas: [] });

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const [me, areas] = await Promise.all([
        supabase.from("people").select("id, name, initials, color").eq("user_id", auth.user.id).maybeSingle(),
        supabase.from("areas").select("id, name, color, owner_id").eq("is_project", true).order("sort"),
      ]);
      setTeam({ me: me.data, areas: areas.data ?? [] });
    })();
  }, []);

  return <TeamContext value={team}>{children}</TeamContext>;
}

export function useTeam() {
  return useContext(TeamContext);
}
