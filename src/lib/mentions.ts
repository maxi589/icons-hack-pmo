import { createClient } from "@/lib/supabase/client";
import type { TargetType } from "@/lib/links";

// Personen im Text taggen (8.11.): „@“ im Editor bietet zuerst das Team an. Gespeichert wird ein normaler Link
// `[@Manu](/team?person=<id>)`, im Editor als Chip. Wer neu getaggt wird, bekommt einen Inbox-Eintrag „hat dich erwähnt“.
// Die Adresse /team gibt es nicht als Seite; ein Klick auf den Chip macht nichts (note-editor.tsx).

export const PERSON_LINK = "/team?person=";
export const personHref = (id: string) => `${PERSON_LINK}${id}`;

const RE = /\]\(\/team\?person=([0-9a-f-]{36})\)/g;

/** Alle getaggten Personen (people.id) im Markdown, ohne Doppelte. */
export function mentionedIn(markdown: string): string[] {
  return [...new Set([...markdown.matchAll(RE)].map((m) => m[1]))];
}

/** Wo der Text steht, damit der Inbox-Eintrag dorthin führt. */
export type MentionTarget = { type: TargetType; id: string };

/** Inbox-Einträge für neu Getaggte (nicht für sich selbst). */
export async function notifyMentions(target: MentionTarget, actorId: string, recipients: string[]) {
  const list = recipients.filter((id) => id !== actorId);
  if (!list.length) return true;
  const { error } = await createClient()
    .from("notifications")
    .insert(list.map((recipient_id) => ({ recipient_id, kind: "mention", target_type: target.type, target_id: target.id, actor_id: actorId })));
  return !error;
}
