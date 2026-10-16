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
| `--bg` | #080809 | #f5f5f6 | App-Hintergrund, Sidebar |
| `--panel` | #0d0d0f | #ffffff | Hauptfläche |
| `--card` | #151517 | #ffffff | Karten |
| `--card2` | #1b1b1d | #f7f7f8 | Gruppenköpfe, Leerzustände |
| `--col` | #09090a | #f4f4f5 | Kanban-Spalte (Mulde) |
| `--line` | rgba(255,255,255,.12) | rgba(0,0,0,.09) | Karten-Ring, Trennlinien (nur Dekoration) |
| `--line2` | rgba(255,255,255,.16) | rgba(0,0,0,.13) | Hover-Ring, Prio-Kästchen |
| `--field` | #707077 | #7c7c85 | Ränder von Eingabefeldern (≥ 3:1) |
| `--text` | #e4e4e8 | #18181b | Haupttext (dunkel bewusst nicht reinweiß: 14,3:1) |
| `--text2` | #bbbbc2 | #52525b | Nebentext |
| `--text3` | #a1a1aa | #5e5e66 | Labels, Meta (hellste erlaubte Textfarbe, ≥ 4,6:1) |
| `--acc` | #0f5ba5 | #0f5ba5 | Fläche: Primärknopf, „+“, Chip „heute“ (Kobalt der Website) |
| `--accText` | #ffffff | #ffffff | Text auf Akzentfläche (6,86:1) |
| `--accLine` | #7fb2ee | #0f5ba5 | Linien, Icons, Fokus, Heute-Linie, aktive Navigation, Fortschritt |

**Flächen neu (Maxi, 14.10.: „weißer bzw. schwärzer, Boxen nicht so fremd“):** hell ist die Hauptfläche reinweiß und Karten heben sich nur über den feinen Ring ab (wie Vercel/Linear), dunkel fast schwarz mit Karten knapp darüber (Kontrast Karte/Fläche 1,04:1). **Dunkel nachjustiert (Maxi, 14.10. abends: „minimal weniger schwarz“):** alle Flächen ein Drittel des Wegs zurück zur alten Graphit-Stufe (Panel L\* 2,8 → 3,7, ein Wahrnehmungsschritt), Abstufung gleich; geprüft von einem Design-Agenten, nachgerechnet: schwächste Werte auf `--card2` `--text3` 6,92:1, `--field` 3,35:1, Bereichsfarben ≥ 4,47:1. Alle Text-, Status-, Bereichs- und Feldfarben auf allen Flächen nachgerechnet: 160 Prüfungen, 0 Fehler (WCAG; schwächste Werte: hell `--text3` 5,84:1, Bereichsfarben ≥ 3,65:1).

**Dunkel: Karten besser abgesetzt (Maxi, 15.10.: „bei Pipeline bissi zu dunkel, man erkennt die Boxen nicht mehr so ganz, minimal heller“):** Prinzip wie Linear/Vercel/Height: die Fläche bleibt fast schwarz, Karten sitzen eine kleine Stufe höher und der feine helle Rand trägt die Kante. Karte #121214 → #151517 (L\* 5,5 → 6,8), `--card2` #18181a → #1b1b1d (Abstand zur Karte gleich), `--line` Weiß 9 % → 12 % (Ring auf der Mulde L\* 11,8 → 15,6), `--line2` 13 % → 16 %, `--field` #6b6b72 → #707077 (damit Feldränder auch auf Hover-Flächen ≥ 3:1 bleiben). Hintergrund, Panel und Mulde unverändert, Hellmodus unverändert. Nachgerechnet (WCAG): 80 Prüfungen auf den fünf Flächen, 0 Fehler; schwächste Werte auf `--card2`: `--text3` 6,71:1, `--field` 3,50:1, Bereichsfarben ≥ 4,33:1; Status-Chips mit Tönung ≥ 6,12:1 (Kontaktiert auf `--card2`), Chip „heute“ 6,27:1. Zusätzlich auf Hover-/Aktiv-Flächen: Text ≥ 5,44:1, Bereichsfarben ≥ 3,51:1; einziger Wert unter 3:1 bleibt `--field` auf `--card2` + Aktiv (2,84:1, vorher 2,75:1; betrifft nur ein Feld auf einem aktiv markierten Gruppenkopf).

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
- **Auswahlfelder** (16.10.): nie `<select>`, immer `Select` aus `src/components/ui/select.tsx` (Base UI, Liste unter dem Feld, Haken am gewählten Eintrag, Gruppen und eingerückte Unterpunkte, lange Namen auf 2 Zeilen, Handy-Zeilen 44px). Listen über `src/lib/options.ts` (`nameOptions`, `msSelectOptions`, `durationOptions`, `PRIO_OPTIONS`). Klick neben die offene Liste schließt nur die Liste, nicht Dialog/Sheet (`selectWasOpen`). Scrollleisten überall dünn (`scrollbar-width: thin`).

## 5. Layout
- **Desktop:** Sidebar 220px (Maxi, 14.10.: enger), auf ein 60px-Icon-Band einklappbar. Der Knopf zum Ein-/Ausklappen sitzt in beiden Zuständen an exakt derselben Stelle oben links. Hauptpanel eingerückt (8px), Radius 14, Ring. Inhalt von Übersicht, Bereichen und „Für mich“ max. 1440px breit, mittig (Maxi, 14.10.: Breite besser nutzen; vorher 1080px). Pipeline über die volle Breite, rechts Detail-Sheet mit 400px.
- **Sidebar:** Einklapp-Knopf + Logo · Suche (Strg K) · Übersicht, Inbox, Für mich · HACKATHON: Termine, Roadmap, Pipeline, Aufgaben, Dokumente · BEREICHE: 5 mit Bereichs-Zeichen (Ring = Fortschritt) und rechts der verantwortlichen Person als Mini-Avatar (gestrichelter Kreis = noch offen) · unten Avatar, Hell/Dunkel, Abmelden. **Klick auf den eigenen Avatar öffnet „Profil“** (auch Strg+K und Handy-Menü oben): Passwort ändern (aktuelles + neues zweimal) und Team mit „Einladen“ (Name + Mail = Eintrag in der Team-Liste, Anmeldung wie beim ersten Mal; „eingeladen“ = noch kein Konto) und Link zum Tool kopieren. Ohne Erklärtexte. Eingeklappt erscheinen die Bereichs-Zeichen ebenfalls. Im Profil oben **„Töne auf diesem Gerät“ An/Aus** (Maxi, 15.10.; ersetzt „kein Sound-Schalter“ vom 14.10.), dazu Strg+K „Töne aus/an“ und im Handy-Menü unter „Töne“. Kein Lautsprecher-Symbol in der Sidebar.
- **Handy** (neu 15.10., Gesamtprüfung vor dem Freeze): Kopfzeile Logo · Suche · **Inbox als Glocke** mit Zähler · Avatar (Menü). Tab-Leiste: Heute · Pipeline · **+** (Akzent-Kreis 52px) · **Termine** · Aufgaben (vorher Aufgaben · Inbox; der Kalender soll sichtbar sein). Das Datum steht in der Label-Zeile der Übersicht statt in der Kopfzeile. Menü: Für mich, Roadmap, Dokumente, Bereiche, Darstellung, Feedback, Abmelden. „+“-Sheet mit eigenem Symbol je Art. Jede Seite beginnt mit `MobileTitle`: Titel links, Hauptaktion („+ Termin“, „+ Aufgabe“ …) rechts in derselben Zeile, Filter darunter in höchstens zwei Zeilen. Leerzustände sind am Handy Karten (auf dem grauen Hintergrund wäre `--card2` unsichtbar). Bottom Sheets, `env(safe-area-inset-bottom)`, Tippflächen mind. 44px, **kein Ziehen & Ablegen** (Status per Sheet).

## 6. Seiten (siehe Boards)
1. **Übersicht** (`Richtung-A-Graphit.dc.html`)
   - Keine Begrüßung (Maxi, 14.10.), stattdessen eine Label-Zeile „Mittwoch, 14. Oktober · Phase 1 von 5 · noch 4 Tage Vorbereitung“.
   - Countdown-Karte als **Live-Uhr** (Maxi, 14.10., Variante B): Tage groß in Michroma, daneben Std : Min : Sek. Jede Ziffer rollt beim Wechsel (300 ms), die Tage rollen beim Öffnen einmal hoch (0,7 s). Ziel: Sa 27.2.2027, 09:00 Wien. Screenreader hören nur die Tage. Darunter der Phasen-Stepper mit 5 Segmenten (Vorbereitung bis 18.10., Akquise bis 18.12., Bewerbung bis 22.1., Programm bis 26.2., Event 27.–28.2.; Zeitplan vom 14.10.); das aktuelle Segment füllt sich in `--accLine`.
   - Karte „Nächster Meilenstein“ mit Unterpunkten und „x von n erledigt“.
   - 4 Zielzahl-Kacheln: Track-Partner x/4, Jury x/4, Venue x/1 plus Backup, Sponsoren mit Ziel offen.
   - „Als Nächstes fällig“, gruppiert nach Tag.
   - „Heute nachfassen“ mit Leerzustand: „Noch nichts nachzufassen. Welle 1 startet am Mo, 19.10. …“, darunter die Nachfass-Runden 2.11., 16.11. und 30.11. **Kreis abhaken = nachgefasst** (Maxi, 15.10., wie „Heute für dich“ am Handy): nächstes Nachfassen in 7 Tagen, Zeile verschwindet sofort, Hinweis mit Rückgängig, danach „hat nachgefasst, nächstes Mal …“ im Verlauf der Firma.
   - Bereiche-Raster mit „Verantwortlich offen“ und dem Knopf „Zuständigkeiten verteilen“.
   - „Als Nächstes“ zeigt die Unterpunkte des nächsten Meilensteins nicht noch einmal (stehen in dessen Karte).
   - **Handy (15.10.):** Label-Zeile mit Datum („Do, 15. Oktober · noch 3 Tage Vorbereitung“). Countdown nur die Uhr in einer Zeile (Tage 42px, Uhr 20px), ohne Label, Zieldatum und Phasen-Balken (Maxi: „unnötigen Fülltext weg“). „Nächster Meilenstein“ mit eingeklappten Unterpunkten (Zeile „0 von 4“ klappt auf). „Heute nachfassen“ nur am Desktop (eigene Fälle stehen in „Heute für dich“). Karten am Handy Radius 12, Abstände 12px. Zielzahlen als eine Karte „Ziele“ mit vier Zeilen (Name, Frist, Balken, Wert), Bereiche als Liste (Zeichen, Name, x/n · nächste Frist, Verantwortliche/r).
2. **Roadmap** (`Graphit-Roadmap.dc.html`)
   - Zeilen je Bereich plus Vorbereitung. Zeitachse 1.10.2026–28.2.2027 (151 Tage, Monate proportional).
   - Rauten für Meilensteine, Balken für Zeiträume: M3 vom 19.10. bis 18.12., M2 vom 19.10. bis 30.11., Sponsoren vom 16.11. bis 18.12., Bewerbung vom 30.11. bis 22.1. (Zeile Marketing & Teilnehmer)
   - Gestrichelte Linien für die Nachfass-Runden, Heute-Linie in Akzent.
   - Klick auf einen Meilenstein öffnet ein Detail-Panel mit Excel-Beschreibung und Unterpunkten.
   - Umschalter Zeitstrahl/Liste. **Am Handy (15.10.) eine kompakte Liste** nach Monat: Raute in Bereichsfarbe (gefüllt = erledigt), Nummer + Titel, darunter Datum · Bereich · x/n Unterpunkte; steht ein offener Unterpunkt früher an, eine dritte Zeile mit seinem Datum (amber ≤ 7 Tage, rot überfällig). Chip nur bei ≤ 7 Tagen. Antippen öffnet das Detail als Bottom Sheet (auch per Direktlink `?m=`).
3. **Pipeline** (`Graphit-Pipeline.dc.html`)
   - Tabs je Typ mit den Begriffen der Website (14.10.): Track-Partner · Sponsoren (Tech-Partner + Supporter) · Jury & Ecosystem · Venues. Umschalter Board/Liste, Zielbalken, Zähler „heute“ und „überfällig“.
   - **Zähler sind Filter** (Maxi, 15.10.): Antippen von „3 überfällig“ bzw. „1 heute“ zeigt nur diese Firmen (Board, Tabelle, Handy-Liste), aktiv mit Rahmen in Chipfarbe + ×, nochmal Antippen hebt auf. Bleibt beim Tab-Wechsel, steht in der Adresse (`?nachfassen=ueberfaellig|heute`). Aktiv und 0 Treffer: Chip „0 überfällig ×“ bleibt stehen, darunter „Keine Treffer.“. Am Handy Tippfläche 44px über ein unsichtbares Feld.
   - **Liste = CRM-Tabelle** (Maxi, 14.10., Variante D nach Prüfschleife, nur Desktop; am Handy bleibt die Liste): Firma (Kürzel, Name, darunter Kategorie · Ort) · Stufe · Prio · Nachfassen · Zuständig · Warmer Kontakt bzw. bei Venues Kapazität (kurz) · **Ansprechperson** bzw. bei Venues **Preis** · **Geändert** („heute“ bzw. „Mi, 14.10.“, wie in Dokumente). Die zwei letzten Spalten (Maxi, 15.10.: weniger leerer Platz rechts) erscheinen nur bei genug Breite: „Geändert“ ab 1304px, Ansprechperson/Preis ab 1200px Tabellenbreite; mit offenem Detail fallen sie weg. 44px-Zeilen, keine Rasterlinien, keine Pills. **Feste Spaltenbreiten mit gleichem Abstand** (Maxi, 14.10.), freier Platz sammelt sich rechts in einer leeren Füllspalte; dadurch bleiben die Spalten stehen, wenn das Detail aufgeht. Nie seitliches Scrollen: unter 1020px Tabellenbreite fällt Warmer Kontakt/Kapazität weg, unter 800px Prio, erst unter 740px schrumpft die Firmenspalte. Ab 1528px Fenster bleibt beim Öffnen des Details alles stehen (gemessen 14.10.). **Erneuter Klick auf die offene Zeile schließt das Detail** (gilt auch für Aufgaben und Dokumente). Standard-Sortierung Nachfassen (Überfälliges oben), jeder Spaltenkopf sortiert. Kopf und Firmenspalte kleben, unten Zähler je Stufe.
   - „Sponsor/Jury“ aus der Excel wird beim Import nach Kategorie zugeordnet, ein Eintrag pro Firma (14.10., ersetzt den Split): VC und Ecosystem → Jury & Ecosystem, Konzerne → Supporter. Einzelne Finaljuror:innen legt man von Hand an.
   - Spalten: Recherche → Kontaktiert → Im Gespräch → Zugesagt → Fix · Abgesagt (schmal).
   - Karte: Initialen, Name, Prio, „warm über X · Welle n“, Nachfass-Chip (heute = Akzent, überfällig = rot), Avatar.
   - Detail-Sheet:
     - Stufe plus Primärknopf „Weiter zu ‚…‘“
     - Eigenschaften (entschlackt 14.10.): Zuständig, Nachfassen (Datum rot/Kobalt je nach Status, +2 T und +1 W in einer Zeile; ist es heute fällig oder überfällig, steht davor **✓ Nachgefasst** (Handy nur ✓): nächstes Mal in 7 Tagen, Rückgängig, Verlaufseintrag; wird es eng, rutschen die Knöpfe in eine zweite Zeile), Prio, Warm über (bestehende Verbindung klein darunter, nicht bei Venues), Ansprechperson, E-Mail / Tel., Website. Venues zusätzlich Block „Eckdaten“: Kapazität, Übernachtung, Preis/Deal, Lage. Dann Notizen. Kein „Mehr“, keine Welle, keine Rollen im Detail (Maxi: nicht overengineeren). Leere Felder zeigen „–“, keine Beispieltexte. Website-Symbol im Kopf, wenn gesetzt.
     - **Block „Aufgaben“** (Maxi, 16.10.) unter den Notizen, vor Termine und Dokumente (`TaskBlock` in `src/components/tasks/task-block.tsx`): offene Aufgaben der Firma nach Frist (Kreis abhaken mit Rückgängig, Titel führt ins Aufgaben-Detail, Frist-Chip, Avatar), darunter „n erledigt“ zum Aufklappen, Leerzustand „Keine Aufgaben.“. „+ Aufgabe“ öffnet den Dialog mit der Firma unter dem Titel, Zuständig = Zuständige/r der Firma (sonst du), Bereich nach Typ.
     - Das Detail-Panel steht rechts über die volle Höhe unter der Kopfzeile; Tabs und Filter stehen nur über der Liste (gilt auch für Aufgaben und Dokumente).
     - „Link kopieren“ überall nur als Link-Symbol in der Ecke.
     - Verlauf aus Systemereignissen und Kommentaren
     - Kommentarfeld mit @
   - Nach einer Änderung erscheint der Hinweis „X → Stufe · Rückgängig“, 5 s, mit Ablauf-Linie. Er ersetzt Sicherheitsfragen.
   - **Automatisches Nachfassen (Maxi, 15.10.):** Wer eine Firma ohne Nachfass-Datum auf „Kontaktiert“ setzt (Board, Detail, Handy-Sheet), bekommt heute + 7 Tage dazu; Hinweis „X → Kontaktiert · nachfassen Do, 22.10.“, Rückgängig nimmt beides zurück. Ein gesetztes Datum bleibt.
   - **Standard-Aufgaben bei „Zugesagt“ (Maxi, 16.10.):** Der Schritt aus einer früheren Stufe auf „Zugesagt“ oder direkt auf „Fix“ legt die Aufgaben des Typs an (Frist = Tage ab dem Wechsel; Liste in `src/lib/standard-tasks.ts`). Track-Partner: Vereinbarung schicken (+3) · Logo + Text für Website holen (+7) · Challenge-Brief abstimmen (+14) · Rechnung stellen (+14) · Zahlung prüfen (+44). Supporter: Vereinbarung, Logo + Text, Rechnung, Zahlung. Tech-Partner: Vereinbarung, Logo + Text, Credits für Teilnehmende klären (+14). Jury & Ecosystem: Briefing schicken (Ablauf, Kriterien) (+7) · Foto + Kurzbio holen (+7) · Anreise + Zeitfenster klären (+21). Venue: Vertrag prüfen + unterschreiben (+3) · Anzahlung klären (+14) · Ablauf vor Ort klären (Technik, Catering, Übernachtung) (+21). Zuständig = Zuständige/r der Firma, sonst wer umstellt; zwei Typen → Liste des ersten (Track-Partner, Supporter, Tech-Partner, Jury, Venue). Gleicher Titel an derselben Firma wird nicht doppelt angelegt; Fix → Zugesagt legt nichts an; direkt auf „Fix“ (= schon unterschrieben) fällt die Vertrags-Aufgabe weg („Vereinbarung schicken“ bzw. „Vertrag prüfen + unterschreiben“). Angelegt wird erst, wenn die Stufe gespeichert ist. Der Hinweis „X → Zugesagt“ steht sofort da und bekommt „· 5 Aufgaben angelegt“ nachgereicht (gemessen 0,4 s); Rückgängig nimmt Stufe und Aufgaben zurück. Hinweise dürfen dafür bis drei Zeilen haben (Handy 375px). Keine Inbox-Einträge für diese Aufgaben (sonst fünf auf einmal); sie stehen in „Für mich“.
   - **Firma an Aufgaben** (16.10.): Standard-Aufgaben heißen bei jeder Firma gleich, deshalb steht die Firma überall dabei: Aufgaben-Liste und -Board, Für mich, Bereichs-Seite (Gebäude-Symbol + Name, `OrgName`; am Handy statt des Bereichs), Übersicht „Als Nächstes“ („Titel · Firma“), „Heute für dich“, Inbox und Strg+K. Im Aufgaben-Detail Feld „Firma“ mit Link in die Pipeline. Aufgaben aus einem Termin übernehmen dessen Firma.
4. **Befehlsleiste** (Strg+K, im Übersicht-Board klickbar)
   - Gruppen: Aktionen (Neue Aufgabe, Termin, Firma, Dokument, Entscheidung) · Gehe zu · Bereiche · Darstellung · Sonstiges.
   - **Keine weiteren Tastenkürzel** (Maxi, 15.10.: „braucht niemand“; vorher G + Buchstabe und C/F/E/T/D). Es bleiben Strg+K, Esc, Strg+Enter (Senden) sowie Pfeiltasten und Enter in Listen und Menüs.
   - **Suche über alles** (Welle 1, 15.10.; Platzhalter „Suchen oder Befehl …“): ab 2 Zeichen auch Firmen, Aufgaben, Termine, Dokumente (inkl. Text und Transkripte), Entscheidungen, Meilensteine (auch per Nummer „M1.2“) und Bereichs-Notizen. Wortteile genügen („Erst“ findet „Erste Bank“), mehrere Wörter müssen alle vorkommen. Texte mit Markdown zählen nur mit ihrem Klartext (`lib/markdown.ts`): keine Treffer nur wegen Link-Adressen („pipeline“, IDs), keine Tabellen-Striche in der Textstelle; ein Chip „BCG“ macht die Notiz für „BCG“ auffindbar. Reihenfolge: passende Seiten und Bereiche oben, dann Inhalts-Gruppen nach bestem Treffer (Titel vor Text), dann Darstellung, Sonstiges, Aktionen. Je Art höchstens 5 Treffer. Zeile: Symbol · Titel · rechts Stufe/Datum/Art/Nummer; steht das Wort nur im Text, darunter eine Textstelle (12,5px `--text3`, Suchwort `--text2`). Enter öffnet das Detail. Während des Ladens „Suche …“.
5. **Bereichs-Seite** (Maxi, 14.10.)
   - Oben eine Kopf-Leiste wie die Eigenschaften eines Projekts in Linear: Verantwortlich (Auswahl direkt im Feld) · Pipeline-Ziel (falls vorhanden, mit Stufen und heute/überfällig) · Meilensteine x/n · Aufgaben x/n.
   - Darunter links **Notizen** im gemeinsamen Editor (siehe 6.7; speichert von selbst nach 0,8 s bzw. beim Verlassen, zeigt „wer · wann“), rechts Meilensteine und Aufgaben. Am Handy Notizen unten.
   - Gleichzeitiges Schreiben: Wer zuletzt speichert, gewinnt. Fremde Änderungen erscheinen live, solange man selbst nicht tippt. Tippt jemand anderes, steht oben „Tim schreibt gerade …“ (Live-Anwesenheit, nichts wird gespeichert).
6. **Für mich** (Welle 1, 15.10., ersetzt „Meine Aufgaben“; `/meine-aufgaben` leitet weiter)
   - **Untereinander** (Maxi, 15.10.: „wie Notion, über die ganze Breite, Aufgaben darüber“): oben „Meine Aufgaben“ nach Fälligkeit (Überfällig · Heute · Nächste 7 Tage · Später · Ohne Frist, Erledigte eingeklappt), darunter der **Notizblock** über die ganze Inhaltsbreite (max. 1440px; privat, Schloss + „privat“ im Kopf, nur die eigene Zeile per RLS). Am Handy genauso.
   - Klick auf eine Aufgabe öffnet das Detail rechts über die volle Höhe (wie Aufgaben-Seite), zweiter Klick schließt. „+ Aufgabe“ ist mit dir vorbelegt.
7. **Gemeinsamer Editor** (Tiptap, gespeichert als Markdown; `src/components/editor/`)
   - Kann Überschriften, Listen, Checklisten, Links, fett, kursiv, Zitat, Trennlinie. Kürzel wie Notion/Linear: `# `, `- `, `[ ] `, `**fett**`, `> `, `---`. Text aus Google Docs behält beim Einfügen die Struktur.
   - Markieren öffnet ein kleines Menü: Fett · Kursiv · Überschrift · Liste · Checkliste · Link · **Aufgabe** (legt die Auswahl als Aufgabe an, dir zugewiesen, im Bereich vorbelegt; der Text wird zum Link auf die Aufgabe).
   - Links öffnen per Klick (Tool-Seiten im selben Tab, alles andere im neuen Tab). Schrift 14px, am Handy 16px, Menü-Knöpfe am Handy 40px.
   - Eingesetzt in Notizblock, Bereichs-Notizen, Text-Dokumenten sowie Agenda und Notizen von Terminen. Leerzeilen-Unterschiede am Ende zählen nicht als Änderung (sonst speichert schon das Öffnen). Im Notizblock zusätzlich **Teilen** (Auswahl wird Team-Dokument).
   - **Notion light, Stufe A** (Maxi, 15.10.; Plan_Erweiterungen 9.2):
     - **„/“-Menü** (nur am Zeilenanfang oder nach einem Leerzeichen): Text · Überschrift 1/2/3 · Liste · Nummerierte Liste · Checkliste · Zitat · Trennlinie · Tabelle (nur auf oberster Ebene) · Verknüpfen … In einer Tabelle stattdessen dieselben Befehle wie am Zellen-Griff (siehe „Tabelle direkt bearbeiten“). Weitertippen filtert, Pfeile + Enter/Tab wählen, Esc schließt nur das Menü (nie das Sheet). Öffnet nur durch eigenes Tippen, nie beim Laden.
     - **„@“ = Verknüpfen:** ab 2 Zeichen Suche (wie Strg+K) über Firmen, Aufgaben, Termine, Dokumente, Entscheidungen, Meilensteine, höchstens 8 Treffer, rechts die Art. Eingefügt wird ein **Chip** mit Symbol der Art (Fläche 10 % `--accLine`, Text `--accLine`, 500; nachgerechnet hell ≥ 5,4:1, dunkel ≥ 6,5:1, beim Drüberfahren ≥ 4,7:1). Gespeichert als normaler Link `[Name](/pipeline?firma=…)`, deshalb sehen auch „→ Aufgabe“-Links so aus. Klick öffnet den Eintrag, gelöschte zeigen „Eintrag gibt es nicht mehr.“; umbenannte behalten den alten Namen.
     - Menü-Optik wie die Befehlsleiste: Karte mit Ring, Radius 12, Desktop 232px breit (Verknüpfen 300px), Zeilen 34px unter dem Cursor; **Handy** Zeilen 44px, über dem Cursor, höchstens 5 Zeilen sichtbar. Das Menü hängt im Editor selbst und nimmt den Fokus nicht (Tastatur bleibt offen, Sheet bleibt offen).
     - **Tabelle:** Zellen nur Text, Kopfzeile immer (Markdown), Spalten nach Inhalt (mind. 96px), Kopf auf `--card2` (500), Linien `--line2`; breite Tabellen scrollen in sich, die Seite nie. Keine Spaltenbreiten (Markdown kann sie nicht speichern).
     - **Tabelle direkt bearbeiten** (15.10., `editor/table-controls.tsx`): Desktop, sobald der Cursor in der Tabelle steht oder die Maus darüber fährt: schmale Leiste „+“ unter der Tabelle (Zeile anhängen, Cursor in die neue Zeile) und rechts daneben (Spalte anhängen, Cursor in den neuen Kopf), 14px, `--card2`, Symbol `--text3`, beim Drüberfahren `--hover`. In der Zelle mit dem Cursor ein Griff „⋯“ (22 × 12px) mittig auf ihrer oberen Linie (verdeckt keinen Text), Menü unter der Zelle: Zeile darunter · Zeile darüber · Spalte rechts · Spalte links · Zeile löschen · Spalte löschen · Tabelle löschen (rot). In der Kopfzeile fehlen „Zeile darüber“ und „Zeile löschen“, bei nur einer Spalte „Spalte löschen“. Beim Zeigen auf Löschen wird Zeile/Spalte/Tabelle rot markiert, danach Hinweis „Zeile gelöscht“ usw. mit Rückgängig (nur solange seitdem nichts geändert wurde). **Handy:** Leiste unter der Tabelle „+ Zeile · + Spalte · ⋯“ (44px), Menü darüber mit 44px-Zeilen, kein Ziehen. Alles liegt über dem Text; unter jeder Tabelle ist der Platz fest reserviert (22px, Handy 52px), damit beim Hineinklicken nichts springt. Der Fokus bleibt im Editor (Tastatur und Sheet bleiben offen); Esc schließt nur das Menü, Pfeile + Enter wählen.
     - **Tastatur in Tabellen:** Tab/Shift+Tab nächste/vorige Zelle (in der letzten Zelle neue Zeile), **Enter und Shift+Enter = Zelle darunter** (in der letzten Zeile neue Zeile; vorher passierte bei Enter nichts, Shift+Enter speicherte ein wörtliches „<br>“). Im Griff-Menü ist der oberste Punkt vorgewählt. Löschen über „/“ zeigt denselben Hinweis mit Rückgängig. Bei mehreren markierten Zellen markiert und löscht es alle betroffenen Zeilen bzw. Spalten.
     - **Schreibbild:** Überschriften oben 1,2/1,1/0,95em Abstand, darunter nur 0,3em (die Überschrift gehört zu ihrem Text). Durchgestrichene Checkpunkte mit Linie in `--text3`, Nummern tabellarisch. Platzhalter: leerer Text zeigt den des Feldes; sonst zeigt die leere Zeile mit dem Cursor „„/“ für Befehle“ (leere Überschrift: „Überschrift 1–3“), nur mit Fokus, nicht in Listen und Tabellen.
     - **Code:** `Code` im Text und Code-Blöcke (```) werden dargestellt und gespeichert (vorher still gelöscht, gemessen 15.10.).
     - Markier-Menü mit H1 · H2 · H3 (Handy nur H2; „Aufgabe“ und „Teilen“ am Handy nur als Symbol, sonst breiter als 390px).
     - **Verlustbremse:** Kann der Editor einen gespeicherten Text nicht vollständig darstellen (Buchstaben fehlen nach dem Laden, z. B. eine Blockart aus einem neueren App-Stand oder ein Bild) oder ergibt er keinen gültigen Inhalt, schaltet er auf nur lesen: Leiste „Nicht alles darstellbar, nur lesen.“ mit „Neu laden“; ungültiger Text erscheint als Rohtext statt eines Absturzes. Leerzeichen am Absatzanfang werden nicht gespeichert (Tiptap 3.31.4 verschluckt sonst nach einer Checkliste ein Zeichen).
     - Bewusst nicht: Datenbanken, Spalten, Unterseiten, Ziehgriff, Toggle (Stufe B nach Go-live).
8. **Dokumente** (Welle 1, 15.10., ersetzt „Wissen“; `/wissen` leitet weiter)
   - Eine Tabelle in der Optik der Pipeline-Tabelle: Symbol + Titel (darunter Art · Domain bzw. Größe) · Bereich · Gehört zu · Von · Geändert. Neueste oben. Wird es eng, fällt erst „Gehört zu“, dann „Bereich“ weg. Am Handy Liste.
   - Filter-Chips mit Zähler: Alle · Texte (inkl. Transkripte) · Dateien & Links · Entscheidungen; dazu Bereich und Suche (Titel, Adresse, Text).
   - Arten erkennt das Tool selbst: Google Doc/Slides/Tabelle/Formular, Drive, Figma, Canva, Notion, Luma an der Adresse, sonst „Link“; Dateien (PDF, Bild, Präsentation, Tabelle); Text; Transkript (.vtt/.srt/.txt/.md werden als Text übernommen, Zeitmarken raus); Entscheidung.
   - **Kein Pflichtformular:** Strg+V eines Links irgendwo auf der Seite legt ihn ab (Titel aus der Adresse, Detail öffnet sich zum Umbenennen), Datei auf die Seite ziehen lädt hoch (max. 50 MB, größer → Drive-Link). „+ Dokument“: Link einfügen · Text schreiben · Datei hochladen · Entscheidung festhalten.
   - Detail: Link/Datei rechts 400px mit „Öffnen ↗“ (Datei über kurzlebigen Link, 5 min), Adresse, Bereich, Gehört zu, Verlauf mit Kommentaren. Text/Transkript als breites Seitenfenster (bis 760px) mit Editor und Knopf **Vollbild**; Eigenschaften und Verlauf darunter eingeklappt.
   - **Eingebettet:** Block „Dokumente“ auf der Bereichs-Seite (rechts unter Aufgaben) und im Firmen-Detail (unter Notizen), mit Feld „Link einfügen oder Datei hierher ziehen“ und Knöpfen Text/Datei; Bereich bzw. Firma vorbelegt.
   - Daten: Tabelle `documents` (Volltext-Index Deutsch für die Suche in Schritt 5), Speicher `dokumente` (privat, nur Team). Faustregel fürs Team: „Drive speichert, das Tool findet.“
9. **Termine** (Welle 1, 15.10.)
   - Desktop **Woche** (Standard, Mo–So, Zeitraster 0–24 Uhr, 48px je Stunde, öffnet bei 8:00 bzw. dem ersten Termin) oder **Liste** (`?ansicht=liste`). Oben je Tag höchstens 2 ganztägige Markierungen (offene Meilensteine, Nachfass-Runden, nur lesen, Klick führt in Roadmap/Pipeline), sonst „+n weitere“. Unterpunkte, die am selben Tag wie ihr Meilenstein fällig sind, stehen nicht extra da (M1 enthält M1.1–M1.4).
   - **Handy (15.10.): Wochenleiste + Agenda** (`mobile-week.tsx`). Oben klebt die Leiste: Monat, „Nur meine“, „Heute“ (nur außerhalb der aktuellen Woche), Pfeile; darunter Mo–So mit Datum (heute im Kobalt-Kreis), Punkten je Termin (Bereichsfarbe, max. 3) und einer Raute für Meilenstein/Nachfass-Runde. Tippen auf einen Tag springt zu ihm, Wischen wechselt die Woche. Darunter die Woche Tag für Tag: Ganztägiges zuerst (Raute + Nummer), dann Termine wie in der Liste. Freie Tage hintereinander werden eine Zeile („Fr, 16.10. – Sa, 17.10. frei“), vergangene freie Tage fallen weg. Unter der Woche „Danach“ mit den nächsten 5 Terminen. Heute: Kobalt-Kreis um die Zahl, leicht getönte Spalte, Jetzt-Linie in `--accLine`.
   - Termin-Block: links 3px Bereichsfarbe, Fläche 13 % Bereichsfarbe auf `--card` (ohne Bereich `--card2`), Titel + Uhrzeit, Video-Symbol bei Meet-Link. Überschneidende Termine stehen nebeneinander.
   - **Verschieben (Maxi, 15.10.):** Termin mit der Maus ziehen verschiebt ihn (15-min-Raster, auch auf einen anderen Tag der Woche), unteren Rand ziehen ändert die Dauer; Vorschau gestrichelt, Original halb durchsichtig. Danach Hinweis „Jetzt … Google-Termin auch anpassen.“ mit Rückgängig. Ein Klick ohne Ziehen öffnet das Detail. Am Handy kein Ziehen (Ändern im Detail).
   - **Anlegen:** Ziehen über die Zeit (15-min-Raster) oder Klick auf eine freie Stelle (1 h), „+ Termin“. Nötig sind nur Titel und Zeit; Wer (vorbelegt du, „Ganzes Team“) und Bereich freiwillig. Kein Meet-Link beim Anlegen.
   - **Detail** rechts 460px (Handy: Bottom Sheet): Datum · Uhrzeit, Knöpfe **Beitreten** (nur mit Meet-Link) · **In Google Kalender** (öffnet Google mit Titel, Zeit, Ort, Gästen = Team-Adressen, Tool-Link; Google erinnert und lädt ein) · **Nächster Termin** (+7 Tage, gleiche Leute, Firma, Link, Agenda als Vorlage, offene Checkboxen aus den Notizen als „Offen vom …“). Eigenschaften Wann (Datum, Beginn, Dauer) · Ort · Meet-Link (Platzhalter „aus Google einfügen“; wer den ganzen Block aus „Teilnahmeinformationen kopieren“ einfügt, bekommt nur den meet.google.com-Link) · Wer · Firma · Bereich. Dann Agenda und Notizen im Editor, Unterlagen (Dokumente am Termin), **Ergebnisse** (+ Aufgabe, + Entscheidung, vorbelegt mit Termin und Bereich), Verlauf mit Kommentaren. **Löschen** (mit Rückgängig): kleines Papierkorb-Symbol im Detail-Kopf neben „Link kopieren“, oder Rechtsklick auf Block bzw. Zeile (am Handy langes Drücken) → Menü Öffnen · Link kopieren · Löschen.
   - **Ablauf mit Google (Teamregel, 15.10.):** Termin im Tool anlegen → „In Google Kalender“ → dort speichern → den Meet-Link, den Google anhängt, ins Tool kopieren. Sonst gibt es zwei verschiedene Calls. Tool und Google sind nicht verbunden: Wer im Tool Datum, Uhrzeit oder Dauer ändert, sieht den Hinweis „Jetzt …. Google-Termin auch anpassen.“
   - Zeit: Beginn als echter Zeitpunkt (`timestamptz`), Anzeige immer Wien; 10:00 bleibt über die Zeitumstellung 10:00.
   - Auch sichtbar: am Handy oben in „Heute für dich“ die eigenen Termine von heute (Uhrzeit, „Beitreten“), Übersicht „Als Nächstes“ (kommende Termine mit Uhrzeit), Block „Termine“ auf der Bereichs-Seite und im Firmen-Detail (mit „+ Termin“), Verlauf der Firma („hat den Termin … eingetragen“), Inbox („hat dich eingetragen“). Dokumente und Entscheidungen können zu einem Termin gehören.
   - Teamregeln: „Jedes Meeting hat eine Seite im Tool.“ „Google erinnert, das Tool hält Agenda, Notizen und Ergebnisse fest.“
10. **Feedback** (Welle 1, 15.10.; Strg+K „Feedback geben“, Handy-Menü „Feedback geben“)
   - Einstieg: Sprechblase unten in der Sidebar neben Hell/Dunkel (auch eingeklappt), kein schwebender Knopf. Die drei Symbole stehen eng (2px), damit der Name daneben nicht abgeschnitten wird.
   - Desktop: Popover rechts am Symbol (340px): Textfeld „Was fällt dir auf?“, Chips Fehler · Idee · Sonstiges (freiwillig), Bildschirmfoto mit Vorschau (per X weg, „Bildschirm mitschicken“ holt es zurück), **Stelle zeigen** (Fadenkreuz, Element anklicken, Esc bricht ab; im Foto eingerahmt in `--accLine`), Senden (Strg+Enter). Handy: Bottom Sheet, ohne „Stelle zeigen“. Danach Hinweis „Danke, ist bei Maxi.“ Der Entwurf bleibt beim Schließen erhalten, jedes Öffnen macht ein neues Foto.
   - Automatisch dabei: Seite (Adresse inkl. offenem Detail), Gerät, Browser, Fenstergröße, hell/dunkel, Version (Commit), Person, Zeit, letzte 10 Fehlermeldungen der Seite.
   - Bei Maxi S: Inbox „hat Feedback gegeben“ mit Status-Chip (offen amber, umgesetzt grün, verworfen grau). Detail rechts 460px (Handy Sheet): Text, Foto (Klick = volle Größe), Seite, Stelle, Gerät, Darstellung, Version, Fehler; Knöpfe **Umgesetzt** · **Verworfen**, danach „Wieder öffnen“. Bei „Umgesetzt“ bekommt die absendende Person nach Ablauf des Rückgängig-Hinweises (5 s) „hat dein Feedback umgesetzt“.
   - Effekte wie rollende Countdown-Ziffern können im Foto fehlen.
11. **Handy** (`Graphit-Handy.dc.html`)
   - „Heute für dich“ zum Abhaken, mit +2 T.
   - Status-Sheet: Stufen als 48px-Zeilen, Nachfass-Chips, Knopf „Speichern“.
   - Firmen-Detail mit Kommentaren, @-Vorschlagsliste und unten fixiertem Eingabefeld.

## 7. Sounds (Präsenz „Voll“, von Maxi am 14.10. auf dem Sound-Board gewählt)
Quelle soundcn, alle Kenney CC0. **Nie einen Sound der Kategorie `warcraft` installieren.** Die Registry kennzeichnet diese Sounds fälschlich als CC0. Sound-Board zum Probehören: https://claude.ai/artifact/Dz3f4n8qSqHCGso3YqMcvr

| Moment | Sound | Lautstärke |
|---|---|---|
| Aufgabe / Unterpunkt erledigt | **Favoriten-Mix:** `click-003` + `drop-003` (12 ms später), gleich laut wie der alte Haken-Ton (RMS gemessen) | 0,225 / 0,183 |
| Firma auf Zugesagt / Fix | `confirmation-004` | 0,32 |
| Meilenstein erledigt | `jingles-pizzi-10` | 0,35 |
| Karte ablegen | `drop-002` / `drop-003` im Wechsel, Tempo ±4 % | 0,12 |
| Strg+K öffnen / schließen | `maximize-008` / `minimize-008` | 0,11 |
| Klick auf Knöpfe, Links, Zeilen | `click-003` | 0,14 |
| Umschalten (Tabs, Filter, Auswahl, Checkbox) | `switch-006` | 0,25 |
| Tippen in Feldern und Editoren | `click-002`, Tempo ±4 % | 0,17 |
| Detail auf / zu | `maximize-006` / `minimize-006` | 0,11 |
| Hinweis erscheint | `drop-002` (still, wenn gerade ein eigener Ton lief) | 0,12 |
| Erwähnung, Fehler | keiner (nie bei eingehenden Nachrichten) | – |

Umsetzung:
- Ein `SoundProvider` an der App-Wurzel dekodiert alle Sounds einmal vor und hört zentral mit (Klick, Umschalten, Tippen, Detail-Fenster mit `data-detail`). Läuft gerade ein Moment mit eigenem Ton (Abhaken, Zusage, Karte, Strg+K, Detail), bleibt der Klick still. Einzelne Elemente schweigen mit `data-sound="none"`.
- Ein zentraler Lautstärkeregler (GainNode).
- `play("taskDone")` mit eigener Lautstärke je Moment.
- Höchstens ein Abspielen pro Sound alle 60–80ms.
- **Schalter „Töne“ pro Gerät** (Maxi, 15.10., auf Empfehlung von Claude; vorher „kein Schalter“): Standard an, Aus gilt nur für dieses Gerät (localStorage, wie Hell/Dunkel), z. B. Laptop in der Bibliothek. Im Profil, Strg+K und Handy-Menü. Beim Einschalten ein kurzer Umschalt-Ton. Die Präsenz des früheren Fun-Modus ist jetzt Standard (Maxi, 14.10. abends: „zu wenig Sound“). Die Tabelle `user_settings` bleibt ungenutzt in der Datenbank.
- Der Ton ist nie das einzige Feedback.
- Das iPhone darf über den Stummschalter stummschalten (nicht umgehen).

## 8. Barrierefreiheit
Echte `<button>`/`<a>`/`<label>`. Icon-Knöpfe mit `aria-label`. Status nie allein über Farbe: Punkt plus Wort, bei Fix ein Haken, bei Abgesagt ein Kreuz. Dialoge halten den Fokus und geben ihn zurück (shadcn/Base UI erledigt das).
