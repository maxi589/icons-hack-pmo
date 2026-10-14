"use client";

import { useSyncExternalStore } from "react";
import { todayInVienna } from "./dates";

// Heutiges Datum (Wien) erst im Browser: Der Server baut die Seiten vorab und kennt „heute“ nicht.
// Prüft jede Minute, damit die Seite auch nach Mitternacht stimmt.

function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 60_000);
  return () => clearInterval(id);
}

export function useToday(): string {
  return useSyncExternalStore(subscribe, () => todayInVienna(), () => "");
}

/** Aktueller Zeitpunkt in ms, auf die Minute gerundet (für „vorbei/kommend“ bei Terminen). 0 auf dem Server. */
export function useNow(): number {
  return useSyncExternalStore(subscribe, () => Math.floor(Date.now() / 60_000) * 60_000, () => 0);
}
