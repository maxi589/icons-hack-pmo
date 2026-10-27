"use client";

import { useEffect, useRef } from "react";
import { useTeam } from "@/components/app-shell/team-provider";
import { logActivity } from "@/lib/data/use-feed";
import type { OrgPatch } from "@/lib/data/use-organizations";
import type { Organization } from "@/lib/pipeline";

// Änderungen an Firmen in den Verlauf (Bau B1, Punkt 2): Prio, Zuständig und Nachfassen als „updated“ mit
// {field, from, to}, gleiches Format wie im Roadmap-Cockpit. Die Stufe hat ihren eigenen Eintrag (changeStage).
// Gesammelt je Firma und Feld: Erst 5 s nach der letzten Änderung (und wenn alle Speichervorgänge zurück sind) kommt ein
// Eintrag, mit dem Wert vor der ersten und nach der letzten Änderung. So ergibt dreimal „+2 T“ einen Eintrag und
// A → B → A (Fehlklick) keinen. „Vorher“ und „nachher“ folgen der Reihenfolge der Klicks, nicht der Antworten (Prüfer 27.10.);
// „nachher“ ist die letzte Änderung, die nicht gescheitert ist (ohne eine: der Ausgangswert), also der Stand der Datenbank.
// Seitenwechsel in der App und Tab-Wechsel schreiben sofort; beim Schließen des Tabs kann der Browser das noch abbrechen.

export const LOGGED_FIELDS = ["prio", "owner_id", "next_follow_up"] as const;
type Field = (typeof LOGGED_FIELDS)[number];

const WAIT_MS = 5000;

type Entry = {
  orgId: string;
  field: Field;
  actorId: string | null;
  from: unknown;
  /** Alle Änderungen in Klick-Reihenfolge; ok = null, solange die Antwort fehlt */
  changes: { to: unknown; ok: boolean | null }[];
  waiting: number;
  timer?: ReturnType<typeof setTimeout>;
};

const same = (a: unknown, b: unknown) => (a ?? null) === (b ?? null);

export function useOrgLog() {
  const { me } = useTeam();
  const meId = me?.id ?? null;
  const pending = useRef(new Map<string, Entry>());

  const flush = (key: string) => {
    const e = pending.current.get(key);
    if (!e) return;
    clearTimeout(e.timer);
    pending.current.delete(key);
    // Noch offene Änderungen zählen mit (Tab-Wechsel vor der Antwort): Sie klappen fast immer
    const last = e.changes.findLast((c) => c.ok !== false);
    const to = last ? last.to : e.from;
    if (!same(e.from, to)) void logActivity("organization", e.orgId, e.actorId, "updated", { field: e.field, from: e.from ?? null, to: to ?? null });
  };

  useEffect(() => {
    const map = pending.current;
    const flushAll = () => [...map.keys()].forEach(flush);
    const onHide = () => document.visibilityState === "hidden" && flushAll();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flushAll);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flushAll);
      flushAll();
    };
  }, []);

  /** Beim Klick aufrufen; `org` ist der Stand vor der Änderung, `saved` das Ergebnis des Speicherns. */
  return (org: Organization, patch: OrgPatch, saved: Promise<boolean>) => {
    for (const field of LOGGED_FIELDS) {
      if (!(field in patch)) continue;
      const from = org[field];
      const to = patch[field];
      if (same(from, to)) continue;
      const key = `${org.id}:${field}`;
      const e: Entry = pending.current.get(key) ?? { orgId: org.id, field, actorId: meId, from, changes: [], waiting: 0 };
      clearTimeout(e.timer);
      const change: Entry["changes"][number] = { to, ok: null };
      e.changes.push(change);
      e.waiting++;
      pending.current.set(key, e);
      saved.then((ok) => {
        e.waiting--;
        change.ok = ok;
        // Schon geschrieben (Seite verlassen) oder noch Antworten offen: kein neuer Timer
        if (pending.current.get(key) !== e || e.waiting > 0) return;
        e.timer = setTimeout(() => flush(key), WAIT_MS);
      });
    }
  };
}
