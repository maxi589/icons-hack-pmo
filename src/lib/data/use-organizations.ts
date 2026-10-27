"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Organization } from "@/lib/pipeline";

// Alle Firmen, Personen und Venues der Pipeline (gut 100 Zeilen) mit Live-Updates.
// Änderungen erscheinen sofort (optimistisch) und werden bei Fehler zurückgenommen.

const FIELDS =
  "id, name, roles, category, location, prio, wave, stage, lost_reason, owner_id, existing_contact, warm_via, contact_person, contact_info, url, next_follow_up, notes, capacity, overnight, price, amount, source, created_at, updated_at";

export type OrgPatch = Partial<Omit<Organization, "id" | "created_at" | "updated_at">>;

export function useOrganizations() {
  const [orgs, setOrgs] = useState<Organization[] | null>(null);
  // Live-Updates laden die Liste neu. Eine Antwort, die vor einer eigenen Änderung angefragt wurde,
  // ist veraltet und darf die Änderung nicht überschreiben (sonst springt z. B. „Rückgängig“ zurück).
  const version = useRef(0);
  const pending = useRef(0);
  // Nach einem Speicherfehler einmal neu laden, sobald nichts mehr offen ist (siehe update)
  const stale = useRef(false);

  const load = useCallback(async () => {
    const v = version.current;
    const { data } = await createClient().from("organizations").select(FIELDS).order("name");
    if (data && pending.current === 0 && v === version.current) setOrgs(data as Organization[]);
  }, []);

  useEffect(() => {
    load();
    const supabase = createClient();
    const channel = supabase
      .channel(`orgs-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "organizations" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const update = useCallback(async (id: string, patch: OrgPatch) => {
    let before: Organization | undefined;
    setOrgs((list) =>
      list?.map((o) => {
        if (o.id !== id) return o;
        before = o;
        return { ...o, ...patch };
      }) ?? null
    );
    version.current++;
    pending.current++;
    const { error } = await createClient().from("organizations").update(patch).eq("id", id);
    pending.current--;
    // Fehler: nur die Felder dieser Änderung zurücknehmen, und nur, wenn sie seitdem nicht neu gesetzt wurden.
    // Sonst ginge z. B. eine gerade gespeicherte Zuständigkeit verloren, wenn die Prio davor scheitert (Prüfer 27.10.).
    if (error && before) {
      const prev = before;
      setOrgs(
        (list) =>
          list?.map((o) => {
            if (o.id !== id) return o;
            const back: Record<string, unknown> = { ...o };
            for (const [k, v] of Object.entries(patch)) if (back[k] === v) back[k] = prev[k as keyof Organization];
            return back as Organization;
          }) ?? null
      );
    }
    // Danach gilt der Stand der Datenbank: Scheitern zwei Änderungen am selben Feld, könnte die Anzeige sonst einen
    // Zwischenwert zeigen, der nie gespeichert wurde (Prüfer 27.10.).
    if (error) stale.current = true;
    if (stale.current && pending.current === 0) {
      stale.current = false;
      void load();
    }
    return !error;
  }, [load]);

  const create = useCallback(async (input: OrgPatch & { name: string; created_by: string | null }) => {
    const { data, error } = await createClient().from("organizations").insert(input).select(FIELDS).single();
    if (error || !data) return null;
    setOrgs((list) => [...(list ?? []), data as Organization].sort((a, b) => a.name.localeCompare(b.name, "de")));
    return data as Organization;
  }, []);

  return { orgs, update, create };
}
