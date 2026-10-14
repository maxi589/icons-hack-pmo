"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TargetType } from "@/lib/links";

// Entscheidungs-Log (was, wann, wer, warum, verknüpftes Thema), angezeigt auf „Dokumente“. Links sind seit Welle 1 Dokumente.
// Live; Änderungen erscheinen sofort und werden bei Fehler zurückgenommen.

export type Decision = {
  id: string;
  title: string;
  reason: string | null;
  decided_on: string;
  decided_by: string[];
  area_id: string | null;
  target_type: TargetType | null;
  target_id: string | null;
  created_by: string | null;
  created_at: string;
};

export type DecisionPatch = Partial<Omit<Decision, "id" | "created_at">>;

const D_FIELDS = "id, title, reason, decided_on, decided_by, area_id, target_type, target_id, created_by, created_at";

export function useKnowledge() {
  const [decisions, setDecisions] = useState<Decision[] | null>(null);
  const version = useRef(0);
  const pending = useRef(0);

  const load = useCallback(async () => {
    const v = version.current;
    const supabase = createClient();
    const d = await supabase.from("decisions").select(D_FIELDS).order("decided_on", { ascending: false }).order("created_at", { ascending: false });
    if (pending.current || v !== version.current) return;
    if (d.data) setDecisions(d.data as Decision[]);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Laden beim Öffnen der Seite
    load();
    const supabase = createClient();
    const channel = supabase
      .channel(`knowledge-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "decisions" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  /** Speichern mit sofortiger Anzeige; bei Fehler kommt der alte Stand zurück. */
  const save = useCallback(
    async <T extends { id: string }>(
      table: "decisions",
      setList: React.Dispatch<React.SetStateAction<T[] | null>>,
      id: string,
      patch: Partial<T>
    ) => {
      let before: T | undefined;
      setList((list) =>
        list?.map((x) => {
          if (x.id !== id) return x;
          before = x;
          return { ...x, ...patch };
        }) ?? null
      );
      version.current++;
      pending.current++;
      const { error } = await createClient().from(table).update(patch as Record<string, unknown>).eq("id", id);
      pending.current--;
      if (error && before) {
        const restore = before;
        setList((list) => list?.map((x) => (x.id === id ? restore : x)) ?? null);
      }
      return !error;
    },
    []
  );

  const updateDecision = useCallback((id: string, patch: DecisionPatch) => save<Decision>("decisions", setDecisions, id, patch), [save]);

  const createDecision = useCallback(async (input: DecisionPatch & { title: string; decided_on: string }) => {
    const { data, error } = await createClient().from("decisions").insert(input).select(D_FIELDS).single();
    if (error || !data) return null;
    version.current++;
    setDecisions((list) =>
      [...(list ?? []).filter((x) => x.id !== data.id), data as Decision].sort(
        (a, b) => b.decided_on.localeCompare(a.decided_on) || b.created_at.localeCompare(a.created_at)
      )
    );
    return data as Decision;
  }, []);

  /** Löschen mit Rückgabe der Zeile, damit „Rückgängig“ sie mit gleicher ID wieder anlegen kann. */
  const removeDecision = useCallback(async (d: Decision) => {
    version.current++;
    setDecisions((list) => list?.filter((x) => x.id !== d.id) ?? null);
    const { error } = await createClient().from("decisions").delete().eq("id", d.id);
    if (error) load();
  }, [load]);

  const restoreDecision = useCallback(async (d: Decision) => {
    version.current++;
    await createClient().from("decisions").insert(d);
    load();
  }, [load]);

  return {
    decisions,
    updateDecision,
    createDecision,
    removeDecision,
    restoreDecision,
  };
}
