# Design-System „Graphit + Kobalt“: Bau-Spezifikation

**Status:** Von Maxi entschieden am 13.10.2026 (Countdown in Michroma, Sounds „Standard“), Farben neu am 14.10.2026: **Graphit + Kobalt** (Lime durch das Blau der Event-Website ersetzt, dunkel bleibt schwarz).
**Referenz-Umsetzung:** `design/leinwand/*.dc.html`. Das sind die Boards der Leinwand https://claude.ai/artifact/EAvS67Yi6WYS5rtPRhiw7Y. Werte und Aufbau dort sind verbindlich, sofern hier nichts anderes steht.
**Alle Kontraste nachgerechnet** (WCAG-Formel) am 13.10.2026.

---

## 1. Grundsätze
- Ruhig, dicht und schnell wie Linear. Jede Seite beantwortet in 5 Sekunden: Wo stehen wir? Was ist als Nächstes dran? Wer ist zuständig?
- **Farbe nur für Bedeutung:** Pipeline-Stufen, Bereichs-Punkte, Fälligkeit. Alles andere ist neutral. Dazu kommt **ein** Akzent (Kobalt).
- Hell und dunkel sind gleichwertig. **Standard = Systemeinstellung** des Geräts. Umschalter in der Sidebar unten.
- Genau zwei Wow-Momente: der Countdown als Live-Uhr (Michroma, Ziffern rollen) und „Meilenstein erledigt“ (Animation + Sound).
- Keine icons-Farben (Wunsch von Maxi). Das Logo ist der einfarbige Schriftzug „hack-vienna“ in Michroma (vorher „icons“).
- **Eventname und Logo „hack-vienna“** (Team, 14.10.): klein, mit Bindestrich wie die Domain. Logo = einfarbiger Schriftzug „hack-vienna“ in Michroma, darunter klein „by icons“ (Sidebar „by icons · 2027“). Seitentitel „… · hack-vienna PMO“, App-Name, App-Icons „hack / vienna“ mit Kobalt-Strich, Favicon „hv“. Name zentral in `src/lib/brand.ts`.
- **Wenig Text (Maxi, 14.10.):** keine Erklärsätze unter Überschriften, in Dialogen oder Leerzuständen. Leerzustand = ein kurzer Satz („Keine Treffer.“, „Noch keine Kommentare.“). Begriffe erklären sich über die Oberfläche, nicht über Hinweistexte.
- **Ausnahme Login-Seite (Maxi, 13.10.):** immer dunkel, Hintergrund schwarz, oben mittig ein leichter Kobalt-Schimmer (atmet langsam) und ein weicher Kobalt-Schein unter dem Mauszeiger. Login-Karte mittig und schlicht. Gilt nur dort.
- **Nicht verwenden:** Glas-Effekte, Glow (Ausnahme oben), animierte Sidebar, Kipp- und Magnet-Effekte, eigener Mauszeiger, WebGL. Außerdem keine Werte oder Code von uimaxx.ing und aicss.dev (beide untersagen KI-Nutzung).

## 2. Farb-Tokens: Graphit + Kobalt (Maxi, 14.10.2026)
Graphit-Flächen wie bisher (dunkel bleibt schwarz), Akzent ist das Kobalt der Event-Website statt Lime. Status-, Bereichs- und Avatarfarben neu abgestimmt. Gebaut von Design-Agenten, geprüft von einem Kritiker: **1.005 Prüfungen bestanden** (WCAG 2.x, APCA 0.0.98G, Farbabstand ΔE2000 ≥ 15 zwischen allen Bedeutungsfarben, keine reinweiße Schrift auf Schwarz, Sättigung dunkel ≤ 0,14). Prüfskript und Werte: `docs/design/palette.json`. Werte stehen in `src/app/globals.css` und nirgends sonst.

| Token | Dunkel | Hell | Verwendung |
|---|---|---|---|
| `--bg` | #050506 | #f5f5f6 | App-Hintergrund, Sidebar |
| `--panel` | #0a0a0b | #ffffff | Hauptfläche |
| `--card` | #0f0f11 | #ffffff | Karten |
| `--card2` | #161618 | #f7f7f8 | Gruppenköpfe, Leerzustände |
| `--col` | #060607 | #f4f4f5 | Kanban-Spalte (Mulde) |

**Flächen neu (Maxi, 14.10.: „weißer bzw. schwärzer, Boxen nicht so fremd“):** hell ist die Hauptfläche reinweiß und Karten heben sich nur über den feinen Ring ab (wie Vercel/Linear), dunkel fast schwarz mit Karten knapp darüber (Kontrast Karte/Fläche 1,03:1). Alle Text-, Status-, Bereichs- und Feldfarben auf allen Flächen nachgerechnet: 160 Prüfungen, 0 Fehler (WCAG; schwächste Werte: hell `--text3` 5,84:1, Bereichsfarben ≥ 3,65:1).
| `--field` | #6b6b72 | #7c7c85 | Ränder von Eingabefeldern (≥ 3:1) |
| `--text` | #e4e4e8 | #18181b | Haupttext (dunkel bewusst nicht reinweiß: 14,3:1) |
| `--text2` | #bbbbc2 | #52525b | Nebentext |
| `--text3` | #a1a1aa | #5e5e66 | Labels, Meta (hellste erlaubte Textfarbe, ≥ 4,6:1) |
| `--acc` | #0f5ba5 | #0f5ba5 | Fläche: Primärknopf, „+“, Chip „heute“ (Kobalt der Website) |
| `--accText` | #ffffff | #ffffff | Text auf Akzentfläche (6,86:1) |
| `--accLine` | #7fb2ee | #0f5ba5 | Linien, Icons, Fokus, Heute-Linie, aktive Navigation, Fortschritt |

**Status-Farben** (dunkel / hell): grau #adb1b8 / #474a52 · Kontaktiert (violett) #c79be4 / #643b9b · amber #f4b067 / #7e4801 · grün #7dbf87 / #206734 · rot #fc9382 / #a32730. „Kontaktiert“ ist violett, damit es nicht mit dem Kobalt-Akzent verwechselt wird (Token heißt weiter `--st-blue`).

**Bereichs-Farben** je Modus (`--area-<id>`, dunkel / hell, ≥ 3:1 auf allen Flächen): Venue & Event #258f7a / #2b8c81 · Track-Partner #1f8ba7 / #0088b3 · Sponsoren #bc6c83 / #c25485 · Programm & Jury #a29547 / #9b7a01 · Marketing & Teilnehmer #b6703f / #ca5e30 · Gesamtleitung (id vorbereitung) #7d8087 / #7b7f88. Der Wert in der Datenbank (`areas.color`) ist nur noch Rückfall.

**Avatar-Farben** (`--avatar-<initialen>`, Initialen #111, ≥ 13,6:1): Maxi S #dbd6ff · Maxi D #ffddd4 · Manu #c4ffe4 · Tim #fff2bc · Kilian #bbeaff.

**Bewegung „Tinten-Sweep“ (Maxi, 14.10., Option 2):** Ein Band läuft durch das Wort und macht es kurz **kräftiger** (Richtung Haupttext), nie blasser. „heute“ 2 Durchläufe, „überfällig“ 1, Wort der aktiven Phase 1 (+ einmal Glanz über den Balken), je 2,8–3,2 s, danach Ruhe (WCAG 2.2.2). Ladeplatzhalter schimmern dauerhaft (Ausnahme Ladeanzeige). Primärknöpfe: ein schräger Glanz (Weiß 16 %) beim Drüberfahren. Countdown: feines Punktraster mit langsamer Welle (≈ 11 s), reagiert auf die Maus (`raster-field.tsx`). Chip „heute“ ist jetzt getönt (Kobalt-Text auf 3–8 % Kobalt) statt gefüllt, ≥ 5,4:1. Der alte Dauer-Lichtstreifen ist entfernt. Bei „Bewegung reduzieren“ steht alles still.

**Login:** Schimmer in #4f8fd9 (0,18 Mitte, 0,06 bei 45 %), Schein unterm Mauszeiger 0,06. **App-Icons:** Schwarz #0c0c0d, Schrift #e4e4e8, Strich #4f8fd9.

**Status-Chips (Maxi, 14.10.):** kein „Oval mit Punkt“ mehr. Chips sind Pillen mit Wort und einem ruhigen Farbverlauf in der Statusfarbe (Klassen `chip-tone`/`chip-amber|red|green`, `chip-today` in `globals.css`). Nur „heute“ (Kobalt) und „überfällig“ (rot) bewegen sich, mit dem Tinten-Sweep (siehe oben). Legenden-Chips mit 0 Einträgen bleiben still (`still`). Bei „Bewegung reduzieren“ im System steht alles still. Tönung im Hellmodus höchstens Amber 7 %, Grün 10 %, Rot 12 % (sonst Text unter 4,5:1, nachgerechnet 14.10.).

**Bereichs-Zeichen (14.10.):** statt Punkt ein kleiner Ring in Bereichsfarbe mit Kern (`AreaGlyph`). Der Ring füllt sich mit dem Anteil erledigter Meilensteine des Bereichs, zeichnet sich beim Erscheinen (300 ms) und wächst beim Drüberfahren leicht.

## 3. Schrift
- **Geist** über das npm-Paket `geist`, lokal ausgeliefert (kein Google-Fonts-Abruf, DSGVO; volle Zeichensätze, Ziffern gleicher Breite). Für Zahlen `font-variant-numeric: tabular-nums`.
- **Geist Mono:** IDs (M1.2), Daten, Abschnitts-Labels. Label-Stil: 10,5px, Großbuchstaben, Laufweite .12em, `--text3`.
- **Michroma** (Google Font, über next/font lokal einbinden): nur für den Schriftzug „hack-vienna“ und die Countdown-Zahl (Desktop 72px, Handy 46px, Laufweite 0,01em).
- Größen Desktop: Listen 13,5px · Fließtext 14px · Kartentitel 14px/600 · Seitentitel 26px/600/−0,025em · Kennzahlen 34px/500.
- Größen Handy: Text 15px · **Eingabefelder 16px** (sonst zoomt das iPhone) · Titel 21–22px.

## 4. Form, Abstand, Bewegung
- **Radien:** 8 (Navigation, kleine Elemente) · 9–10 (Knöpfe, Felder) · 12–14 (Karten, Panel) · 16 (Befehlsleiste, Dialog) · 26 (Handy-Sheet oben) · 999 (Chips)
- **Abstände:** 4 / 8 / 12 / 16 / 20 / 24 / 32
- **Schatten:** Karten-Ring `0 0 0 1px var(--line)` plus `0 1px 2px` (dunkel .35, hell .05). Befehlsleiste `0 24px 64px rgba(0,0,0,.45)`.
- **Bewegung:** Tailwind-Standard, 150ms für Hover/Farbe, 200ms für Zustandswechsel, 300ms für Öffnen/Schließen, `ease-out`. Klick-Feedback `scale(.97)`. `prefers-reduced-motion` immer respektieren.
- **Fokus:** `:focus-visible` mit 2px `--accLine` und 2px Abstand.

## 5. Layout
- **Desktop:** Sidebar 220px (Maxi, 14.10.: enger), auf ein 60px-Icon-Band einklappbar. Der Knopf zum Ein-/Ausklappen sitzt in beiden Zuständen an exakt derselben Stelle oben links. Hauptpanel eingerückt (8px), Radius 14, Ring. Inhalt von Übersicht, Bereichen und Wissen max. 1440px breit, mittig (Maxi, 14.10.: Breite besser nutzen; vorher 1080px). Pipeline über die volle Breite, rechts Detail-Sheet mit 400px.
- **Sidebar:** Einklapp-Knopf + Logo · Suche (Strg K) · Übersicht, Inbox, Meine Aufgaben · HACKATHON: Roadmap, Pipeline, Aufgaben, Wissen · BEREICHE: 5 mit Bereichs-Zeichen (Ring = Fortschritt) und rechts der verantwortlichen Person als Mini-Avatar (gestrichelter Kreis = noch offen) · unten Avatar, Hell/Dunkel, Abmelden. Eingeklappt erscheinen die Bereichs-Zeichen ebenfalls. Kein Sound-Schalter (Maxi, 14.10.: Sounds sind immer an, auch kein Schalter in Strg+K oder im Handy-Menü).
- **Handy:** Tab-Leiste: Heute · Pipeline · **+** (Akzent-Kreis 52px) · Aufgaben · Inbox. Bottom Sheets, `env(safe-area-inset-bottom)`, Tippflächen mind. 44px, **kein Ziehen & Ablegen** (Status per Sheet).

## 6. Seiten (siehe Boards)
1. **Übersicht** (`Richtung-A-Graphit.dc.html`)
   - Keine Begrüßung (Maxi, 14.10.), stattdessen eine Label-Zeile „Mittwoch, 14. Oktober · Phase 1 von 5 · noch 4 Tage Vorbereitung“.
   - Countdown-Karte als **Live-Uhr** (Maxi, 14.10., Variante B): Tage groß in Michroma, daneben Std : Min : Sek. Jede Ziffer rollt beim Wechsel (300 ms), die Tage rollen beim Öffnen einmal hoch (0,7 s). Ziel: Sa 27.2.2027, 09:00 Wien. Screenreader hören nur die Tage. Darunter der Phasen-Stepper mit 5 Segmenten (Vorbereitung bis 18.10., Akquise bis 18.12., Bewerbung bis 22.1., Programm bis 26.2., Event 27.–28.2.; Zeitplan vom 14.10.); das aktuelle Segment füllt sich in `--accLine`.
   - Karte „Nächster Meilenstein“ mit Unterpunkten und „x von n erledigt“.
   - 4 Zielzahl-Kacheln: Track-Partner x/4, Jury x/4, Venue x/1 plus Backup, Sponsoren mit Ziel offen.
   - „Als Nächstes fällig“, gruppiert nach Tag.
   - „Heute nachfassen“ mit Leerzustand: „Noch nichts nachzufassen. Welle 1 startet am Mo, 19.10. …“, darunter die Nachfass-Runden 2.11., 16.11. und 30.11.
   - Bereiche-Raster mit „Verantwortlich offen“ und dem Knopf „Zuständigkeiten verteilen“.
2. **Roadmap** (`Graphit-Roadmap.dc.html`)
   - Zeilen je Bereich plus Vorbereitung. Zeitachse 1.10.2026–28.2.2027 (151 Tage, Monate proportional).
   - Rauten für Meilensteine, Balken für Zeiträume: M3 vom 19.10. bis 18.12., M2 vom 19.10. bis 30.11., Sponsoren vom 16.11. bis 18.12., Bewerbung vom 30.11. bis 22.1. (Zeile Marketing & Teilnehmer)
   - Gestrichelte Linien für die Nachfass-Runden, Heute-Linie in Akzent.
   - Klick auf einen Meilenstein öffnet ein Detail-Panel mit Excel-Beschreibung und Unterpunkten.
   - Umschalter Zeitstrahl/Liste. Am Handy nur die Liste.
3. **Pipeline** (`Graphit-Pipeline.dc.html`)
   - Tabs je Typ mit den Begriffen der Website (14.10.): Track-Partner · Sponsoren (Tech-Partner + Supporter) · Jury & Ecosystem · Venues. Umschalter Board/Liste, Zielbalken, Zähler „heute“ und „überfällig“.
   - **Liste = CRM-Tabelle** (Maxi, 14.10., Variante D nach Prüfschleife, nur Desktop; am Handy bleibt die Liste): Firma (Kürzel, Name, darunter Kategorie · Ort) · Stufe · Prio · Nachfassen · Zuständig · Warmer Kontakt bzw. bei Venues Kapazität (kurz). 44px-Zeilen, keine Rasterlinien, keine Pills. **Feste Spaltenbreiten mit gleichem Abstand** (Maxi, 14.10.), freier Platz sammelt sich rechts in einer leeren Füllspalte; dadurch bleiben die Spalten stehen, wenn das Detail aufgeht. Nie seitliches Scrollen: unter 1020px Tabellenbreite fällt die Füllspalte weg (Firma nimmt den Rest), unter 900px die letzte Spalte, unter 700px auch Prio. **Erneuter Klick auf die offene Zeile schließt das Detail** (gilt auch für Aufgaben und Wissen). Standard-Sortierung Nachfassen (Überfälliges oben), jeder Spaltenkopf sortiert. Kopf und Firmenspalte kleben, unten Zähler je Stufe.
   - „Sponsor/Jury“ aus der Excel wird beim Import nach Kategorie zugeordnet, ein Eintrag pro Firma (14.10., ersetzt den Split): VC und Ecosystem → Jury & Ecosystem, Konzerne → Supporter. Einzelne Finaljuror:innen legt man von Hand an.
   - Spalten: Recherche → Kontaktiert → Im Gespräch → Zugesagt → Fix · Abgesagt (schmal).
   - Karte: Initialen, Name, Prio, „warm über X · Welle n“, Nachfass-Chip (heute = Akzent, überfällig = rot), Avatar.
   - Detail-Sheet:
     - Stufe plus Primärknopf „Weiter zu ‚…‘“
     - Eigenschaften (entschlackt 14.10.): Zuständig, Nachfassen (Datum rot/Kobalt je nach Status, +2 T und +1 W in einer Zeile), Prio, Warm über (bestehende Verbindung klein darunter, nicht bei Venues), Ansprechperson, E-Mail / Tel., Website. Venues zusätzlich Block „Eckdaten“: Kapazität, Übernachtung, Preis/Deal, Lage. Dann Notizen. Kein „Mehr“, keine Welle, keine Rollen im Detail (Maxi: nicht overengineeren). Leere Felder zeigen „–“, keine Beispieltexte. Website-Symbol im Kopf, wenn gesetzt.
     - Das Detail-Panel steht rechts über die volle Höhe unter der Kopfzeile; Tabs und Filter stehen nur über der Liste (gilt auch für Aufgaben und Wissen).
     - „Link kopieren“ überall nur als Link-Symbol in der Ecke.
     - Verlauf aus Systemereignissen und Kommentaren
     - Kommentarfeld mit @
   - Nach einer Änderung erscheint der Hinweis „X → Stufe · Rückgängig“, 5 s, mit Ablauf-Linie. Er ersetzt Sicherheitsfragen.
4. **Befehlsleiste** (Strg+K, im Übersicht-Board klickbar)
   - Gruppen: Zuletzt · Aktionen (Neue Aufgabe C, Firma F, Entscheidung E) · Gehe zu (G R …).
   - Tastenkürzel stehen rechts in Kästchen.
5. **Bereichs-Seite** (Maxi, 14.10.)
   - Oben eine Kopf-Leiste wie die Eigenschaften eines Projekts in Linear: Verantwortlich (Auswahl direkt im Feld) · Pipeline-Ziel (falls vorhanden, mit Stufen und heute/überfällig) · Meilensteine x/n · Aufgaben x/n.
   - Darunter links **Notizen** (freies Textfeld als Ablage, speichert von selbst nach 0,8 s bzw. beim Verlassen, zeigt „wer · wann“), rechts Meilensteine und Aufgaben. Am Handy Notizen unten.
   - Gleichzeitiges Schreiben: Wer zuletzt speichert, gewinnt. Fremde Änderungen erscheinen live, solange man selbst nicht tippt.
6. **Handy** (`Graphit-Handy.dc.html`)
   - „Heute für dich“ zum Abhaken, mit +2 T.
   - Status-Sheet: Stufen als 48px-Zeilen, Nachfass-Chips, Knopf „Speichern“.
   - Firmen-Detail mit Kommentaren, @-Vorschlagsliste und unten fixiertem Eingabefeld.

## 7. Sounds („Standard“, von Maxi entschieden)
Quelle soundcn (`npx shadcn add @soundcn/use-sound @soundcn/<name>`), alle Kenney CC0. **Nie einen Sound der Kategorie `warcraft` installieren.** Die Registry kennzeichnet diese Sounds fälschlich als CC0.

| Moment | Sound | Startlautstärke | Standard |
|---|---|---|---|
| Aufgabe erledigt | `confirmation-001` | 0,19 | an |
| Firma auf Zugesagt / Fix | `confirmation-004` | 0,32 | an |
| Meilenstein erledigt | `jingles-pizzi-10` | 0,35 | an |
| Karte ablegen | `drop-002` / `drop-003` im Wechsel, Tempo ±4 % | 0,12 | an |
| Strg+K öffnen / schließen | `maximize-008` / `minimize-008` | 0,11 | an |
| Erwähnung, Fehler | `question-002` / `error-008` | 0,16 / 0,55 | aus (nur bei eigenen Aktionen, nie bei eingehenden Nachrichten) |

Umsetzung:
- Ein `SoundProvider` an der App-Wurzel dekodiert alle Sounds einmal vor.
- Ein zentraler Lautstärkeregler (GainNode).
- `play("taskDone")` mit eigener Lautstärke je Moment.
- Höchstens ein Abspielen pro Sound alle 60–80ms.
- **Kein Schalter und kein Fun-Modus** (Maxi, 14.10.: „sieht kindisch aus“). Sounds sind immer an, stumm geht über das Gerät. Die Tabelle `user_settings` bleibt ungenutzt in der Datenbank.
- Der Ton ist nie das einzige Feedback.
- Das iPhone darf über den Stummschalter stummschalten (nicht umgehen).

## 8. Barrierefreiheit
Echte `<button>`/`<a>`/`<label>`. Icon-Knöpfe mit `aria-label`. Status nie allein über Farbe: Punkt plus Wort, bei Fix ein Haken, bei Abgesagt ein Kreuz. Dialoge halten den Fokus und geben ihn zurück (shadcn/Base UI erledigt das).
