"use client";

import { useToast } from "@/components/toast";
import { useTeam } from "@/components/app-shell/team-provider";
import { logActivity } from "@/lib/data/use-feed";
import { formatShort } from "@/lib/dates";
import { play } from "@/lib/sounds";
import { shiftFollowUp } from "@/lib/pipeline";

// „Nachgefasst“ am Desktop (Maxi, 15.10.): wie das Abhaken in „Heute für dich“ am Handy. Nächstes Nachfassen in 7 Tagen,
// Hinweis mit Rückgängig, nach Ablauf ein Eintrag „hat nachgefasst“ im Verlauf der Firma (wer · wann).
// `save` schreibt das Datum über den Weg der jeweiligen Seite (Pipeline optimistisch, Übersicht direkt).

type FollowOrg = { id: string; name: string; next_follow_up: string | null };

export function useFollowedUp() {
  const { me } = useTeam();
  const toast = useToast();

  return (org: FollowOrg, today: string, save: (date: string | null) => void) => {
    const before = org.next_follow_up;
    const next = shiftFollowUp(null, today, 7);
    save(next);
    play("taskDone");
    toast({
      text: `${org.name} nachgefasst · wieder am ${formatShort(next)}`,
      onAction: () => save(before),
      onExpire: () => logActivity("organization", org.id, me?.id ?? null, "followed_up", { date: before, next }),
    });
  };
}
