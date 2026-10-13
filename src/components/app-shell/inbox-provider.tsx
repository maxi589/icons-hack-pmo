"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { targetHref, type TargetType } from "@/lib/links";
import { useTeam } from "./team-provider";

// Inbox der angemeldeten Person: Erwähnungen und Zuweisungen (Tabelle notifications, RLS = nur die eigenen).
// Einmal im App-Rahmen geladen und live gehalten, damit Zähler in Sidebar und Tab-Leiste, die Inbox-Seite
// und „Heute für dich“ dieselben Daten nutzen. Keine Mails (Entscheidung Chat 2).

export type InboxItem = {
  id: string;
  kind: "mention" | "assignment";
  target_type: TargetType;
  target_id: string;
  actor_id: string | null;
  read_at: string | null;
  created_at: string;
  /** Kommentartext bei Erwähnungen */
  body: string | null;
  /** Name des Eintrags; null = inzwischen gelöscht */
  targetName: string | null;
  href: string;
};

type Inbox = {
  items: InboxItem[] | null;
  unread: number;
  setRead: (ids: string[], read: boolean) => Promise<void>;
};

const InboxContext = createContext<Inbox>({ items: null, unread: 0, setRead: async () => {} });

type Row = {
  id: string;
  kind: InboxItem["kind"];
  target_type: TargetType;
  target_id: string;
  actor_id: string | null;
  read_at: string | null;
  created_at: string;
  comment: { body: string } | null;
};

/** Namen der verlinkten Einträge nachladen (Firma, Aufgabe, Meilenstein, Entscheidung). */
async function targetNames(rows: Row[]) {
  const supabase = createClient();
  const ids = (t: TargetType) => [...new Set(rows.filter((r) => r.target_type === t).map((r) => r.target_id))];
  const names = new Map<string, string>();
  const load = async (t: TargetType, table: string, field: string) => {
    const list = ids(t);
    if (!list.length) return;
    const { data } = await supabase.from(table).select(`id, ${field}`).in("id", list);
    for (const d of (data ?? []) as unknown as Record<string, string>[]) names.set(`${t}:${d.id}`, d[field]);
  };
  await Promise.all([
    load("organization", "organizations", "name"),
    load("task", "tasks", "title"),
    load("milestone", "milestones", "title"),
    load("decision", "decisions", "title"),
  ]);
  return names;
}

export function InboxProvider({ children }: { children: React.ReactNode }) {
  const { me } = useTeam();
  const [items, setItems] = useState<InboxItem[] | null>(null);
  // Wie in use-organizations.ts: eine ältere Antwort überschreibt keine eigene Änderung.
  const version = useRef(0);

  const load = useCallback(async () => {
    const v = version.current;
    const { data } = await createClient()
      .from("notifications")
      .select("id, kind, target_type, target_id, actor_id, read_at, created_at, comment:comment_id(body)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (!data) return;
    const rows = data as unknown as Row[];
    const names = await targetNames(rows);
    if (v !== version.current) return;
    setItems(
      rows.map(({ comment, ...r }) => ({
        ...r,
        body: comment?.body ?? null,
        targetName: names.get(`${r.target_type}:${r.target_id}`) ?? null,
        href: targetHref(r.target_type, r.target_id),
      }))
    );
  }, []);

  useEffect(() => {
    if (!me) return;
    load();
    const supabase = createClient();
    const channel = supabase
      .channel(`inbox-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `recipient_id=eq.${me.id}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [me, load]);

  const setRead = useCallback(async (ids: string[], read: boolean) => {
    if (!ids.length) return;
    const readAt = read ? new Date().toISOString() : null;
    version.current++;
    setItems((list) => list?.map((n) => (ids.includes(n.id) ? { ...n, read_at: readAt } : n)) ?? null);
    const { error } = await createClient().from("notifications").update({ read_at: readAt }).in("id", ids);
    if (error) load();
  }, [load]);

  const unread = useMemo(() => items?.filter((n) => !n.read_at).length ?? 0, [items]);

  return <InboxContext value={{ items, unread, setRead }}>{children}</InboxContext>;
}

export function useInbox() {
  return useContext(InboxContext);
}
