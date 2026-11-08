"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Meeting, MeetingPatch } from "@/lib/meetings";

// Termine (Tabelle meetings). Live; Änderungen erscheinen sofort und werden bei Fehler zurückgenommen.
// Versionszähler wie in use-organizations.ts: eine ältere Antwort überschreibt keine eigene Änderung.

const FIELDS =
  "id, title, starts_at, duration_min, location, meet_url, area_id, organization_id, attendees, private_for, goals, goals_updated_at, goals_updated_by, agenda, agenda_updated_at, agenda_updated_by, notes, notes_updated_at, notes_updated_by, created_by, created_at";

const byStart = (a: Meeting, b: Meeting) => a.starts_at.localeCompare(b.starts_at);

export function useMeetings() {
  /** null = lädt, false = Tabelle fehlt bzw. Fehler */
  const [meetings, setMeetings] = useState<Meeting[] | null | false>(null);
  const version = useRef(0);
  const pending = useRef(0);

  const load = useCallback(async () => {
    const v = version.current;
    const { data, error } = await createClient().from("meetings").select(FIELDS).order("starts_at");
    if (pending.current || v !== version.current) return;
    setMeetings(error ? false : (data as Meeting[]));
  }, []);

  useEffect(() => {
    load();
    const supabase = createClient();
    const channel = supabase
      .channel(`meetings-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "meetings" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const update = useCallback(async (id: string, patch: MeetingPatch) => {
    let before: Meeting | undefined;
    setMeetings((list) =>
      list
        ? list
            .map((m) => {
              if (m.id !== id) return m;
              before = m;
              return { ...m, ...patch };
            })
            .sort(byStart)
        : list
    );
    version.current++;
    pending.current++;
    const { error } = await createClient().from("meetings").update(patch).eq("id", id);
    pending.current--;
    if (error && before) {
      const restore = before;
      setMeetings((list) => (list ? list.map((m) => (m.id === id ? restore : m)) : list));
    }
    return !error;
  }, []);

  const create = useCallback(async (input: MeetingPatch & { title: string; starts_at: string }) => {
    const { data, error } = await createClient().from("meetings").insert(input).select(FIELDS).single();
    if (error || !data) return null;
    version.current++;
    setMeetings((list) => [...(list || []).filter((m) => m.id !== data.id), data as Meeting].sort(byStart));
    return data as Meeting;
  }, []);

  /** Löschen; mit `restore` lässt es sich rückgängig machen (gleiche ID, Kommentare und Ergebnisse bleiben verknüpft). */
  const remove = useCallback(
    async (m: Meeting) => {
      version.current++;
      setMeetings((list) => (list ? list.filter((x) => x.id !== m.id) : list));
      const { error } = await createClient().from("meetings").delete().eq("id", m.id);
      if (error) load();
    },
    [load]
  );

  const restore = useCallback(
    async (m: Meeting) => {
      version.current++;
      await createClient().from("meetings").insert(m);
      load();
    },
    [load]
  );

  return { meetings, update, create, remove, restore };
}

/** Mail-Adressen der Teilnehmenden (für „In Google Kalender eintragen“). */
export async function attendeeEmails(ids: string[]) {
  if (!ids.length) return [];
  const { data } = await createClient().from("people").select("email").in("id", ids);
  return (data ?? []).map((p) => p.email as string);
}
