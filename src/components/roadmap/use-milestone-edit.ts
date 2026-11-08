"use client";

import { useToast } from "@/components/toast";
import { useTeam } from "@/components/app-shell/team-provider";
import { logActivity, type FeedItem } from "@/lib/data/use-feed";
import { daysBetween, formatShort } from "@/lib/dates";
import type { Milestone, MilestonePatch } from "@/lib/data/use-milestones";
import { KEY } from "@/lib/key-milestones";
import { AXIS_END } from "@/lib/roadmap";

// Plan änderbar (Roadmap-Cockpit, Maxi 16.10.): Datum, Titel und Beschreibung eines Meilensteins.
// Jede Änderung zeigt einen Hinweis mit „Rückgängig“ (der Plan gilt für alle; versehentliches Tippen soll sich leicht
// zurücknehmen lassen). In den Verlauf kommt sie erst nach Ablauf des Hinweises und nur, wenn sie gespeichert ist,
// immer mit altem und neuem Wert.

/** Datum nur im Rahmen des Zeitstrahls 1.10.2026–31.3.2027 (Debrief im März, seit 8.11.) (sonst z. B. „0002-10-21“ aus einem halb getippten Jahr oder
 *  eine Raute, die optisch am Rand klebt; Prüfer 16.10.). */
export const DATE_MIN = "2026-10-01";
export const DATE_MAX = AXIS_END;

const clean = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");

export function useMilestoneEdit(update: (id: string, patch: MilestonePatch) => Promise<boolean>) {
  const toast = useToast();
  const { me } = useTeam();
  const meId = me?.id ?? null;

  /** Speichern mit Hinweis + Rückgängig; Verlauf nach Ablauf, nur wenn gespeichert. */
  const change = <F extends keyof MilestonePatch>(m: Milestone, field: F, to: MilestonePatch[F], text: string, logged: boolean) => {
    const from = m[field] as MilestonePatch[F];
    const saved = update(m.id, { [field]: to });
    let undone = false;
    const setText = toast({
      text,
      onAction: () => {
        undone = true;
        update(m.id, { [field]: from });
      },
      onExpire: () => {
        if (logged)
          saved.then((ok) => {
            if (ok) logActivity("milestone", m.id, meId, "updated", { field, from, to });
          });
      },
    });
    saved.then((ok) => !ok && !undone && setText(`${m.id}: nicht gespeichert. Bitte nochmal versuchen.`));
  };

  const changeDate = (m: Milestone, to: string) => {
    if (!to || to === m.due_date) return;
    // Das Event-Datum hängt am Countdown und an der Zeitachse (Prüfer 16.10.)
    if (m.id === KEY.event) {
      toast({ text: `${KEY.event} ist der Hackathon selbst, sein Datum bleibt fest.`, error: true });
      return;
    }
    if (to < DATE_MIN || to > DATE_MAX) {
      toast({ text: "Datum bitte zwischen 1.10.2026 und 31.3.2027.", error: true });
      return;
    }
    // Balken (M2, M3): Ende nicht vor dem Beginn
    if (m.start_date && to < m.start_date) {
      toast({ text: `${m.id} beginnt am ${formatShort(m.start_date)}, früher geht nicht.`, error: true });
      return;
    }
    change(m, "due_date", to, `${m.id} → ${formatShort(to)}`, true);
  };

  const changeText = (m: Milestone, field: "title" | "description", value: string | null) => {
    if (value === m[field] || (field === "title" && !value)) return;
    // Nur Leerzeichen/Zeilenumbrüche anders: speichern, aber kein Eintrag „„X“ → „X““ im Verlauf
    const logged = clean(value) !== clean(m[field]);
    change(m, field, value, `${m.id}: ${field === "title" ? "Titel" : "Beschreibung"} geändert`, logged);
  };

  /** Bereich wechseln (Punkt 5): die Raute wandert in die andere Zeile des Zeitstrahls. */
  const changeArea = (m: Milestone, to: string, toName: string) => {
    if (!to || to === m.area_id) return;
    change(m, "area_id", to, `${m.id} → ${toName}`, true);
  };

  /** Beginn eines Zeitraums (M2, M3) ändern: nicht nach dem Ende, nicht außerhalb des Rahmens. */
  const changeStart = (m: Milestone, to: string) => {
    if (!to || to === m.start_date) return;
    if (to < DATE_MIN || to > DATE_MAX) {
      toast({ text: "Datum bitte zwischen 1.10.2026 und 31.3.2027.", error: true });
      return;
    }
    if (to > m.due_date) {
      toast({ text: `${m.id} endet am ${formatShort(m.due_date)}, später beginnen geht nicht.`, error: true });
      return;
    }
    change(m, "start_date", to, `${m.id} beginnt ${formatShort(to)}`, true);
  };

  return { changeDate, changeText, changeArea, changeStart };
}

/** „verschoben +2 T“: Abstand zum ursprünglich geplanten Datum (Spalte baseline_due), 0 = wie geplant. */
export const shiftDays = (m: Milestone) => (m.baseline_due ? daysBetween(m.baseline_due, m.due_date) : 0);

/** „alt“ → „neu“, gekürzt, aber unterscheidbar: Bei langem gleichem Anfang beginnen beide kurz vor der ersten Änderung
 *  („… gleichzeitig.“ → „… gleichzeitig. Test.“). Sonst sähen zwei gekürzte Texte gleich aus (gemessen 16.10.). */
function pair(from: unknown, to: unknown) {
  const a = clean(from);
  const b = clean(to);
  let same = 0;
  while (same < a.length && same < b.length && a[same] === b[same]) same++;
  let start = same > 40 ? same - 25 : 0;
  const space = a.indexOf(" ", start);
  if (start && space > 0 && space < same) start = space + 1;
  const cut = (s: string) => {
    const t = s.slice(start);
    return (start ? "…" : "") + (t.length > 60 ? `${t.slice(0, 59)}…` : t);
  };
  return `„${cut(a)}“ → „${cut(b)}“`;
}

const shortText = (v: unknown) => {
  const s = clean(v);
  return s.length > 60 ? `${s.slice(0, 59)}…` : s;
};

/** Verlauf eines Meilensteins in Worten (vorher stand hier der Rohtext der Aktion). `areaName` übersetzt Bereichs-IDs. */
export function describeMilestone(a: Extract<FeedItem, { kind: "activity" }>, areaName: (id: string) => string = (id) => id) {
  const d = a.data;
  if (a.action === "created") return "hat den Meilenstein angelegt";
  if (a.action === "sub_deleted") return `hat den Unterpunkt ${String(d.id)} „${shortText(d.title)}“ gelöscht`;
  if (a.action === "status_changed") return d.to === "erledigt" ? "hat abgehakt" : "hat wieder geöffnet";
  if (a.action === "updated") {
    if (d.field === "due_date") return `hat das Datum von ${formatShort(String(d.from))} auf ${formatShort(String(d.to))} verschoben`;
    if (d.field === "start_date") return `hat den Beginn von ${formatShort(String(d.from))} auf ${formatShort(String(d.to))} verschoben`;
    if (d.field === "area_id") return `hat den Bereich von ${areaName(String(d.from))} auf ${areaName(String(d.to))} geändert`;
    if (d.field === "title") return `hat den Titel geändert: ${pair(d.from, d.to)}`;
    if (d.field === "description") {
      if (!clean(d.to)) return "hat die Beschreibung entfernt";
      if (!clean(d.from)) return `hat eine Beschreibung ergänzt: „${shortText(d.to)}“`;
      return `hat die Beschreibung geändert: ${pair(d.from, d.to)}`;
    }
  }
  return "hat etwas geändert";
}
