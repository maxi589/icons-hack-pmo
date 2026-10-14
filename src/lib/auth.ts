// Mindestlänge für Passwörter (Anmelden beim ersten Mal und Passwort ändern).
export const MIN_PASSWORD = 10;

// Nur interne Pfade als Rücksprungziel erlauben (kein „//fremde-seite.de“).
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}
