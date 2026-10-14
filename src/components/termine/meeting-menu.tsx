"use client";

import { Link2, PanelRight, Trash2 } from "lucide-react";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import { useToast } from "@/components/toast";
import { meetingHref, type Meeting } from "@/lib/meetings";

// Rechtsklick auf einen Termin (Woche, Liste; am Handy langes Drücken): Öffnen · Link kopieren · Löschen (mit Rückgängig).
// `children` ist das Element selbst (Block bzw. Zeile), es wird zum Auslöser ohne zusätzliche Hülle.

export function MeetingMenu({
  meeting: m,
  onOpen,
  onDelete,
  children,
}: {
  meeting: Meeting;
  onOpen: () => void;
  onDelete: () => void;
  children: React.ReactElement;
}) {
  const toast = useToast();
  return (
    <ContextMenu>
      <ContextMenuTrigger render={children} />
      <ContextMenuContent aria-label={`Aktionen für „${m.title}“`}>
        <ContextMenuItem onClick={onOpen}>
          <PanelRight aria-hidden />
          Öffnen
        </ContextMenuItem>
        <ContextMenuItem
          onClick={async () => {
            await navigator.clipboard.writeText(window.location.origin + meetingHref(m.id));
            toast({ text: "Link kopiert" });
          }}
        >
          <Link2 aria-hidden />
          Link kopieren
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 aria-hidden />
          Löschen
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
