// Nur interne Pfade als Rücksprungziel erlauben (kein „//fremde-seite.de“).
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}

// Google-Konten der icons-Domain; Google zeigt dann direkt die passenden Konten an.
export const GOOGLE_HOSTED_DOMAIN = "icons.at";
