"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { NotesData } from "@/components/editor/notes-card";

// Privater Notizblock der angemeldeten Person (Tabelle notepads, RLS: nur die eigene Zeile).
// Hört live mit, damit Handy und Laptop denselben Stand zeigen.

type Row = { content: string; updated_at: string | null; person_id: string };
const toNotes = (r: Row): NotesData => ({ notes: r.content ?? "", updatedAt: r.updated_at, updatedBy: r.person_id });

export function useNotepad(personId: string | null | undefined) {
  /** null = lädt, false = Tabelle fehlt bzw. Fehler (Karte wird dann nicht gezeigt) */
  const [data, setData] = useState<NotesData | null | false>(null);

  useEffect(() => {
    if (!personId) return;
    const supabase = createClient();
    supabase
      .from("notepads")
      .select("content, updated_at, person_id")
      .eq("person_id", personId)
      .maybeSingle()
      .then(({ data: row, error }) =>
        setData(error ? false : row ? toNotes(row as Row) : { notes: "", updatedAt: null, updatedBy: personId })
      );

    const channel = supabase
      .channel(`notepad-${personId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notepads", filter: `person_id=eq.${personId}` }, (payload) => {
        if (payload.eventType !== "DELETE") setData(toNotes(payload.new as Row));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [personId]);

  const save = useCallback(
    async (content: string) => {
      if (!personId) return false;
      const row = { person_id: personId, content, updated_at: new Date().toISOString() };
      const { error } = await createClient().from("notepads").upsert(row);
      if (!error) setData(toNotes(row));
      return !error;
    },
    [personId]
  );

  return { data, save };
}
