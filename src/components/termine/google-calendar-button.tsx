"use client";

import { useState } from "react";
import { CalendarSync } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/toast";
import { myCalendarLink } from "@/lib/calendar-actions";

// „Zu Google Kalender“ (17.10.): öffnet Google mit „Kalender hinzufügen?“ für den eigenen Kalender „hack-vienna HQ“.
// Einmal pro Person; danach stehen alle Termine und Meilensteine von selbst dort.
export function GoogleCalendarButton({ className }: { className?: string }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        // Fenster sofort öffnen, sonst blockiert der Browser es nach dem Warten auf den Link.
        const win = window.open("", "_blank");
        setBusy(true);
        const url = await myCalendarLink();
        setBusy(false);
        if (url && win) {
          win.opener = null;
          win.location.href = url;
          return;
        }
        win?.close();
        if (url) window.open(url, "_blank", "noopener,noreferrer");
        else toast({ text: "Google Kalender ist noch nicht verbunden." });
      }}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-[9px] px-3 text-[13px] font-medium text-fg-2 shadow-[inset_0_0_0_1px_var(--line2)] transition-colors duration-150 hover:bg-hover hover:text-fg disabled:opacity-60 max-md:h-11 max-md:text-[14px]",
        className
      )}
    >
      <CalendarSync className="size-3.5" aria-hidden />
      Zu Google Kalender
    </button>
  );
}
