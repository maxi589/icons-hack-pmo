"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Notizen eines Bereichs (Spalte areas.notes): freies Textfeld als Ablage fürs Teilprojekt.
// Hört live mit; die Seite übernimmt fremde Änderungen nur, solange man nicht selbst gerade schreibt.

export type AreaNotes = { notes: string; updatedAt: string | null; updatedBy: string | null };

type Row = { notes: string; notes_updated_at: string | null; notes_updated_by: string | null };
const toNotes = (r: Row): AreaNotes => ({ notes: r.notes ?? "", updatedAt: r.notes_updated_at, updatedBy: r.notes_updated_by });

export function useAreaNotes(areaId: string) {
  /** null = lädt, false = Spalte fehlt bzw. Fehler (Karte wird dann nicht gezeigt) */
  const [data, setData] = useState<AreaNotes | null | false>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("areas")
      .select("notes, notes_updated_at, notes_updated_by")
      .eq("id", areaId)
      .single()
      .then(({ data: row, error }) => setData(error || !row ? false : toNotes(row as Row)));

    const channel = supabase
      .channel(`area-notes-${areaId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "areas", filter: `id=eq.${areaId}` }, (payload) =>
        setData(toNotes(payload.new as Row))
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [areaId]);

  const save = useCallback(
    async (notes: string, by: string | null) => {
      const patch = { notes, notes_updated_at: new Date().toISOString(), notes_updated_by: by };
      const { error } = await createClient().from("areas").update(patch).eq("id", areaId);
      if (!error) setData(toNotes(patch));
      return !error;
    },
    [areaId]
  );

  return { data, save };
}
