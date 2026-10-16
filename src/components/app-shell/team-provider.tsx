"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Lädt einmal pro Sitzung die angemeldete Person, das Team und die Bereiche.
// Der App-Rahmen bleibt beim Seitenwechsel stehen, deshalb wird nicht bei jedem Klick neu geladen.
// Bereiche hören live mit: Ändert jemand eine Zuständigkeit, sehen es alle sofort.

export type Person = { id: string; name: string; initials: string; color: string };
export type Area = {
  id: string;
  name: string;
  color: string;
  owner_id: string | null;
  is_project: boolean;
  /** Ziel in ganzen Euro (nur Bereich „sponsoren“ genutzt: Sponsoring-Ziel, Maxi 16.10.) */
  goal_amount: number | null;
};

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
  setAreaGoal: (areaId: string, amount: number | null) => Promise<boolean>;
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
  setAreaGoal: async () => false,
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
        .select("id, name, color, owner_id, is_project, goal_amount")
        .order("sort");
      // Farbe je Hell/Dunkel aus den Tokens (--area-<id> in globals.css), Datenbank-Wert nur als Rückfall.
      if (data) setAreas(data.map((a) => ({ ...a, color: `var(--area-${a.id}, ${a.color})` })));
    };

    (async () => {
      // Anmeldung prüfen und gleichzeitig Team + Bereiche laden (vorher nacheinander: Seitenleiste kam später, gemessen 16.10.)
      const [{ data: auth }, team] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("people").select("id, name, initials, color, user_id").order("sort"),
        loadAreas(),
      ]);
      if (!auth.user) {
        // Sitzung abgelaufen oder anderswo beendet: zum Login statt einer halb leeren Seite.
        const next = window.location.pathname + window.location.search;
        window.location.replace(`/login?next=${encodeURIComponent(next)}`);
        return;
      }
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

  /** Bereich ändern: sofort sichtbar, bei Fehler zurück. */
  const patchArea = useCallback(async (areaId: string, patch: Partial<Pick<Area, "owner_id" | "goal_amount">>) => {
    // Bei Fehler nur die geänderten Felder zurück (eine fremde Änderung an anderen Feldern bleibt stehen)
    let before: Partial<Area> | undefined;
    setAreas((list) =>
      list.map((a) => {
        if (a.id !== areaId) return a;
        before = Object.fromEntries(Object.keys(patch).map((k) => [k, a[k as keyof Area]]));
        return { ...a, ...patch };
      })
    );
    const { error } = await createClient().from("areas").update(patch).eq("id", areaId);
    if (error && before) {
      const restore = before;
      setAreas((list) => list.map((a) => (a.id === areaId ? { ...a, ...restore } : a)));
      return false;
    }
    return !error;
  }, []);
  const setAreaOwner = useCallback((areaId: string, ownerId: string | null) => patchArea(areaId, { owner_id: ownerId }), [patchArea]);
  const setAreaGoal = useCallback((areaId: string, amount: number | null) => patchArea(areaId, { goal_amount: amount }), [patchArea]);

  const reloadPeople = useCallback(async () => {
    const { data } = await createClient().from("people").select("id, name, initials, color").order("sort");
    if (data) setPeople(data.map(({ id, name, initials, color }) => ({ id, name, initials, color: tone(initials, color) })));
  }, []);

  return (
    <TeamContext value={{ me, people, areas, allAreas: lanes, areaById, personById, setAreaOwner, setAreaGoal, reloadPeople }}>{children}</TeamContext>
  );
}

export function useTeam() {
  return useContext(TeamContext);
}
