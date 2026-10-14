"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TargetType } from "@/lib/links";

// Verlauf eines Eintrags: Systemereignisse (Tabelle activity) und Kommentare, zeitlich gemischt.
// Kommentare mit @Erwähnung erzeugen Einträge in der Inbox (notifications). Keine Mails (Entscheidung Chat 2).

export type { TargetType } from "@/lib/links";

export type FeedItem =
  | { kind: "activity"; id: string; created_at: string; actor_id: string | null; action: string; data: Record<string, unknown> }
  | { kind: "comment"; id: string; created_at: string; author_id: string; body: string; mentions: string[] };

export function useFeed(targetType: TargetType, targetId: string | null) {
  const [items, setItems] = useState<FeedItem[] | null>(null);

  const load = useCallback(async () => {
    if (!targetId) return;
    const supabase = createClient();
    const [a, c] = await Promise.all([
      supabase.from("activity").select("id, created_at, actor_id, action, data").eq("target_type", targetType).eq("target_id", targetId),
      supabase.from("comments").select("id, created_at, author_id, body, mentions").eq("target_type", targetType).eq("target_id", targetId),
    ]);
    const list: FeedItem[] = [
      ...(a.data ?? []).map((x) => ({ kind: "activity" as const, ...x, id: String(x.id) })),
      ...(c.data ?? []).map((x) => ({ kind: "comment" as const, ...x })),
    ].sort((x, y) => x.created_at.localeCompare(y.created_at));
    setItems(list);
  }, [targetType, targetId]);

  useEffect(() => {
    if (!targetId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- neuer Eintrag gewählt: Verlauf neu laden
    setItems(null);
    load();
    const supabase = createClient();
    const filter = `target_id=eq.${targetId}`;
    const channel = supabase
      .channel(`feed-${targetId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "activity", filter }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "comments", filter }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [targetId, load]);

  return { items, reload: load };
}

/** Systemereignis schreiben, z. B. Stufe geändert. */
export async function logActivity(
  targetType: TargetType,
  targetId: string,
  actorId: string | null,
  action: string,
  data: Record<string, unknown> = {}
) {
  await createClient().from("activity").insert({ target_type: targetType, target_id: targetId, actor_id: actorId, action, data });
}

/** Kommentar speichern und Erwähnte benachrichtigen (nicht sich selbst). */
export async function addComment(targetType: TargetType, targetId: string, authorId: string, body: string, mentions: string[]) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("comments")
    .insert({ target_type: targetType, target_id: targetId, author_id: authorId, body, mentions })
    .select("id")
    .single();
  if (error || !data) return false;
  const recipients = mentions.filter((id) => id !== authorId);
  if (recipients.length) {
    await supabase.from("notifications").insert(
      recipients.map((recipient_id) => ({
        recipient_id,
        kind: "mention",
        target_type: targetType,
        target_id: targetId,
        actor_id: authorId,
        comment_id: data.id,
      }))
    );
  }
  return true;
}

/** Zuweisung: neue zuständige Person bekommt einen Inbox-Eintrag (nicht, wenn man sich selbst zuweist). */
export async function notifyAssignment(targetType: TargetType, targetId: string, actorId: string | null, recipientId: string | null) {
  if (!recipientId || recipientId === actorId) return;
  await createClient()
    .from("notifications")
    .insert({ recipient_id: recipientId, kind: "assignment", target_type: targetType, target_id: targetId, actor_id: actorId });
}
