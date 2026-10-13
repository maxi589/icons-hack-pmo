# UI-Empfehlung: icons Hackathon PMO-Tool

**Stand:** 13.10.2026 · **Leinwand mit allen Boards:** https://claude.ai/artifact/EAvS67Yi6WYS5rtPRhiw7Y (privat, Teilen über das Menü „Teilen“)

> **Von Maxi entschieden am 13.10.2026:** Graphit · Akzent **Lime** · Countdown in **Michroma** · Sounds **„Standard“**. Die verbindliche Bau-Spezifikation steht in `design/Design-System.md`.

## Ergebnis
**Richtung A „Graphit“ mit Signatur-Akzent.** Ruhig und dicht wie Linear, Farbe nur für Bedeutung (Stufen, Bereiche), dazu ein eigener Akzent für Knöpfe, Fortschritt, Heute-Linie und Fokus. Der Countdown steht in der Logo-Breitschrift (Michroma). Hell und dunkel sind gleichwertig, Standard ist die Einstellung des Geräts. **Keine icons-Farben** (Wunsch von Maxi), höchstens das Logo als einfarbiger Schriftzug.

## Technik-Unterbau (nach Prüfschleife)
- Fundament: shadcn/ui mit **Base UI** (Standard seit Juli 2026), Tailwind v4, Next.js, Schrift Geist über das npm-Paket `geist` (lokal ausgeliefert, kein Google-Abruf).
- Bedienbares nur aus shadcn: Befehlsleiste (Strg+K), Sidebar, Drawer (Handy-Sheet), Hinweise mit „Rückgängig“ (Sonner), Tabelle.
- Kanban: **Kibo UI** (MIT, dnd-kit `@dnd-kit/core` 6.3.1, Maus/Touch/Tastatur). Am Handy kein Ziehen, Status per Sheet.
- Zeitstrahl: selbst gebaut, schlicht (Desktop waagrecht, Handy als Liste).
- beUI höchstens für die animierte Zahl. Halaska und bencho nur als Ideenquelle. **Keine Werte und kein Code von UImaxxing oder AICSS** (KI-Nutzung dort untersagt).
- Bewegung: Tailwind-Standard 150 / 200 / 300 ms, ease-out, reduzierte Bewegung respektieren.
- Woche beginnt Montag, alles in Zeitzone Europe/Vienna, Nachfass-Termine als reines Datum (Sommerzeit endet 25.10.).

## Regeln für Kontrast und Bedienung (gemessen)
- Text mindestens 4,5 : 1, Ränder von Eingabefeldern mindestens 3 : 1, dünne Akzentlinien im Hellmodus in der dunklen Akzentvariante.
- Status nie nur über Farbe: Punkt plus Wort (plus Icon bei Fix / Abgesagt).
- Handy: Tippflächen mindestens 44 px, Eingabefelder 16 px, Tab-Leiste Heute · Pipeline · + · Aufgaben · Inbox.

## Akzent-Varianten (alle geprüft)
| Akzent | Dunkel: Fläche / Text | Hell: Fläche / Text | Hell: Linie |
|---|---|---|---|
| Lime (Vorschlag) | #c6f432 / #0a0a0b (15,4 : 1) | #c6f432 / #0a0a0b | #4d7c0f (4,8 : 1) |
| Indigo | #818cf8 / #0a0a0b (6,6 : 1) | #4f46e5 / weiß (6,3 : 1) | #4f46e5 |
| Orange | #fb923c / #0a0a0b (8,7 : 1) | #c2410c / weiß (5,2 : 1) | #c2410c |

## Sounds (soundcn, alle Kenney CC0)
Maxis Favoriten: click-003 (= click-soft), drop-002, drop-003, maximize-006, maximize-008, switch-006.
Vorgeschlagenes Set: Haken `confirmation-001` · Deal `confirmation-004` · Meilenstein `jingles-pizzi-10` · Drop `drop-002`/`drop-003` im Wechsel · Strg+K `maximize-008` / `minimize-008` · Erwähnung `question-002` · Fehler `error-008` · Tippen `click-002` · Klick `click-003` · Schalter `switch-006`.
Regeln: nie Töne bei eingehenden Benachrichtigungen, ein Schalter für alles (im Profil gespeichert), Lautstärken pro Ton abgestimmt. **Nie einen Sound der Kategorie `warcraft` installieren** (in der Registry fälschlich als CC0 markiert).

## Login und Mail (größtes Go-live-Risiko)
- Login mit 6-stelligem Code per Mail statt Link (Mail-Scanner verbrauchen Links).
- Resend mit eigener, per DNS bestätigter Absender-Domain und eigener Mailversand (SMTP) in Supabase, fertig **vor dem 17.10.** Der Supabase-Standardversand schafft nur 2 Mails pro Stunde, und nur an Team-Adressen.

## Herkunft
Seiten im Browser angesehen und vermessen (Subagents und selbst), Lizenzen und Doku gelesen, Kontraste selbst nachgerechnet, Prüfer-Befunde stichprobenartig nachgeprüft. Details auf den Boards „Analyse & Empfehlung“ und „Prüfschleife“.
