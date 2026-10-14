"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTeam } from "@/components/app-shell/team-provider";
import { useToday } from "@/lib/use-today";
import { formatShort, TIME_ZONE, todayInVienna } from "@/lib/dates";
import { createClient } from "@/lib/supabase/client";
import { NoteEditor } from "./note-editor";

// Notizen-Karte mit dem gemeinsamen Editor: speichert von selbst nach 0,8 s bzw. beim Verlassen,
// zeigt „wer · wann“ und, bei geteilten Notizen, wer gerade schreibt. Wer zuletzt speichert, gewinnt.

export type NotesData = { notes: string; updatedAt: string | null; updatedBy: string | null };

const timeFmt = new Intl.DateTimeFormat("de-AT", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

type Props = {
  title: string;
  /** Name des Felds für Screenreader */
  label: string;
  /** null = lädt, false = nicht verfügbar (Karte wird dann nicht gezeigt) */
  data: NotesData | null | false;
  save: (markdown: string) => Promise<boolean>;
  placeholder?: string;
  /** Privat: Schloss im Kopf, kein Name im „wer · wann“, keine Anwesenheit */
  private?: boolean;
  /** Schlüssel für „… schreibt gerade“ (nur bei geteilten Notizen) */
  presenceKey?: string;
  onCreateTask?: (title: string) => Promise<string | null>;
  className?: string;
};

export function NotesCard({ title, label, data, save, placeholder, private: isPrivate, presenceKey, onCreateTask, className }: Props) {
  const { personById } = useTeam();
  const today = useToday();
  const [draft, setDraft] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const pending = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { writers, typing } = usePresence(presenceKey);
  // Über eine Ref, damit `flush` stabil bleibt (sonst speichert das Aufräumen unten bei jedem Neuzeichnen).
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const value = pending.current;
    if (value === null) return;
    pending.current = null;
    setState("saving");
    const ok = await saveRef.current(value);
    setState(ok ? "saved" : "error");
  }, []);

  // Beim Verlassen der Seite nichts verlieren.
  useEffect(() => () => void flush(), [flush]);

  if (data === false) return null;

  // Solange man schreibt (draft gesetzt), gilt der eigene Text; sonst der gespeicherte (auch fremde Änderungen live).
  const value = draft ?? data?.notes ?? "";

  const onChange = (next: string) => {
    setDraft(next);
    pending.current = next;
    setState("idle");
    typing();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 800);
  };

  let meta = "";
  if (writers.length) meta = `${writers.map((id) => personById(id)?.name ?? "Jemand").join(", ")} schreibt gerade …`;
  else if (state === "saving") meta = "Speichert …";
  else if (state === "saved" && draft !== null) meta = "Gespeichert";
  else if (state === "error") meta = "Nicht gespeichert";
  else if (data?.updatedAt) {
    const day = todayInVienna(new Date(data.updatedAt));
    const when = day === today ? `heute, ${timeFmt.format(new Date(data.updatedAt))}` : formatShort(day);
    const who = isPrivate ? null : personById(data.updatedBy)?.name;
    meta = who ? `${who} · ${when}` : when;
  }

  return (
    <section
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-[14px] bg-card shadow-card transition-shadow duration-150 has-[.ProseMirror-focused]:shadow-[0_0_0_2px_var(--accLine)]",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
        <h2 className="flex items-center gap-1.5 text-[14px] font-semibold">
          {title}
          {isPrivate && (
            <span className="inline-flex items-center gap-1 text-[12px] font-normal text-fg-3" title="Nur für dich sichtbar">
              <Lock className="size-3" aria-hidden />
              privat
            </span>
          )}
        </h2>
        <span className={cn("truncate text-[12px] text-fg-3 tabular", state === "error" && "text-st-red")} aria-live="polite">
          {meta}
        </span>
      </div>
      <NoteEditor
        value={value}
        label={label}
        placeholder={placeholder}
        disabled={data === null}
        onChange={onChange}
        onBlur={async () => {
          await flush();
          // Nach dem Speichern wieder dem gespeicherten Stand folgen (fremde Änderungen erscheinen live).
          if (pending.current === null) setDraft(null);
        }}
        onCreateTask={onCreateTask}
        className="flex min-h-[320px] flex-1 flex-col border-t border-line lg:min-h-[460px]"
      />
    </section>
  );
}

// ---------------------------------------------------------------
// „… schreibt gerade“: Live-Anwesenheit über Supabase Realtime (nichts wird gespeichert)
// ---------------------------------------------------------------
function usePresence(key: string | undefined) {
  const { me } = useTeam();
  const [writers, setWriters] = useState<string[]>([]);
  const channel = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const stop = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTyping = useRef(false);
  const myId = me?.id;

  useEffect(() => {
    if (!key || !myId) return;
    const supabase = createClient();
    const ch = supabase.channel(`notes-presence-${key}`, { config: { presence: { key: myId } } });
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState<{ typing: boolean }>();
      setWriters(Object.entries(state).filter(([id, metas]) => id !== myId && metas.some((m) => m.typing)).map(([id]) => id));
    }).subscribe((status) => {
      if (status === "SUBSCRIBED") ch.track({ typing: false });
    });
    channel.current = ch;
    return () => {
      if (stop.current) clearTimeout(stop.current);
      channel.current = null;
      isTyping.current = false;
      supabase.removeChannel(ch);
    };
  }, [key, myId]);

  /** Beim Tippen melden; nach 3 s Pause gilt man nicht mehr als schreibend. */
  const typing = useCallback(() => {
    const ch = channel.current;
    if (!ch) return;
    if (!isTyping.current) {
      isTyping.current = true;
      ch.track({ typing: true });
    }
    if (stop.current) clearTimeout(stop.current);
    stop.current = setTimeout(() => {
      isTyping.current = false;
      ch.track({ typing: false });
    }, 3000);
  }, []);

  return { writers, typing };
}
