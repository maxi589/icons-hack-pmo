"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Lädt einmal pro Sitzung die angemeldete Person, das Team und die Bereiche.
// Der App-Rahmen bleibt beim Seitenwechsel stehen, deshalb wird nicht bei jedem Klick neu geladen.
// Bereiche hören live mit: Ändert jemand eine Zuständigkeit, sehen es alle sofort.

export type Person = { id: string; name: string; initials: string; color: string };
export type Area = { id: string; name: string; color: string; owner_id: string | null; is_project: boolean };

type Team = {
  me: Person | null;
  people: Person[];
  /** Die 7 Teilprojekte (ohne „Vorbereitung“). */
  areas: Area[];
  /** Jeder Bereich inkl. „Vorbereitung“, z. B. für Farbpunkte an Meilensteinen. */
  /** Alle 8 Bereiche inkl. „Vorbereitung“ (vorne), für die Zeilen der Roadmap. */
  allAreas: Area[];
  areaById: (id: string | null | undefined) => Area | null;
  personById: (id: string | null | undefined) => Person | null;
  setAreaOwner: (areaId: string, ownerId: string | null) => Promise<boolean>;
  /** Team neu laden, z. B. nach einer Einladung. */
  reloadPeople: () => Promise<void>;
};

const TeamContext = createContext<Team>({
  me: null,
  people: [],
  areas: [],
  allAreas: [],
  areaById: () => null,
  personById: () => null,
  setAreaOwner: async () => false,
  reloadPeople: async () => {},
});

// Avatar-Farbe aus den Tokens (--avatar-<initialen>), Datenbank-Wert als Rückfall (z. B. für neu Eingeladene).
const tone = (initials: string, color: string) => `var(--avatar-${initials.toLowerCase()}, ${color})`;

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Person | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [allAreas, setAreas] = useState<Area[]>([]);

  useEffect(() => {
    const supabase = createClient();
    const loadAreas = async () => {
      const { data } = await supabase
        .from("areas")
        .select("id, name, color, owner_id, is_project")
        .order("sort");
      // Farbe je Hell/Dunkel aus den Tokens (--area-<id> in globals.css), Datenbank-Wert nur als Rückfall.
      if (data) setAreas(data.map((a) => ({ ...a, color: `var(--area-${a.id}, ${a.color})` })));
    };

    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        // Sitzung abgelaufen oder anderswo beendet: zum Login statt einer halb leeren Seite.
        const next = window.location.pathname + window.location.search;
        window.location.replace(`/login?next=${encodeURIComponent(next)}`);
        return;
      }
      const [team] = await Promise.all([
        supabase.from("people").select("id, name, initials, color, user_id").order("sort"),
        loadAreas(),
      ]);
      const list = team.data ?? [];
      setPeople(list.map(({ id, name, initials, color }) => ({ id, name, initials, color: tone(initials, color) })));
      const mine = list.find((p) => p.user_id === auth.user!.id);
      if (mine) setMe({ id: mine.id, name: mine.name, initials: mine.initials, color: tone(mine.initials, mine.color) });
    })();

    const channel = supabase
      .channel("areas")
      .on("postgres_changes", { event: "*", schema: "public", table: "areas" }, loadAreas)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const areas = useMemo(() => allAreas.filter((a) => a.is_project), [allAreas]);
  const lanes = useMemo(() => [...allAreas.filter((a) => !a.is_project), ...areas], [allAreas, areas]);
  const areaById = useCallback((id: string | null | undefined) => allAreas.find((a) => a.id === id) ?? null, [allAreas]);
  const personById = useCallback((id: string | null | undefined) => people.find((p) => p.id === id) ?? null, [people]);

  const setAreaOwner = useCallback(async (areaId: string, ownerId: string | null) => {
    let before: string | null = null;
    setAreas((list) =>
      list.map((a) => {
        if (a.id !== areaId) return a;
        before = a.owner_id;
        return { ...a, owner_id: ownerId };
      })
    );
    const { error } = await createClient().from("areas").update({ owner_id: ownerId }).eq("id", areaId);
    if (error) {
      setAreas((list) => list.map((a) => (a.id === areaId ? { ...a, owner_id: before } : a)));
      return false;
    }
    return true;
  }, []);

  const reloadPeople = useCallback(async () => {
    const { data } = await createClient().from("people").select("id, name, initials, color").order("sort");
    if (data) setPeople(data.map(({ id, name, initials, color }) => ({ id, name, initials, color: tone(initials, color) })));
  }, []);

  return (
    <TeamContext value={{ me, people, areas, allAreas: lanes, areaById, personById, setAreaOwner, reloadPeople }}>{children}</TeamContext>
  );
}

export function useTeam() {
  return useContext(TeamContext);
}
