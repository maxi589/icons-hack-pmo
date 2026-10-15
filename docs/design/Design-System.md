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
| `--card` | #121214 | #ffffff | Karten |
| `--card2` | #18181a | #f7f7f8 | Gruppenköpfe, Leerzustände |
| `--col` | #09090a | #f4f4f5 | Kanban-Spalte (Mulde) |

**Flächen neu (Maxi, 14.10.: „weißer bzw. schwärzer, Boxen nicht so fremd“):** hell ist die Hauptfläche reinweiß und Karten heben sich nur über den feinen Ring ab (wie Vercel/Linear), dunkel fast schwarz mit Karten knapp darüber (Kontrast Karte/Fläche 1,04:1). **Dunkel nachjustiert (Maxi, 14.10. abends: „minimal weniger schwarz“):** alle Flächen ein Drittel des Wegs zurück zur alten Graphit-Stufe (Panel L\* 2,8 → 3,7, ein Wahrnehmungsschritt), Abstufung gleich; geprüft von einem Design-Agenten, nachgerechnet: schwächste Werte auf `--card2` `--text3` 6,92:1, `--field` 3,35:1, Bereichsfarben ≥ 4,47:1. Alle Text-, Status-, Bereichs- und Feldfarben auf allen Flächen nachgerechnet: 160 Prüfungen, 0 Fehler (WCAG; schwächste Werte: hell `--text3` 5,84:1, Bereichsfarben ≥ 3,65:1).
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
- **Desktop:** Sidebar 220px (Maxi, 14.10.: enger), auf ein 60px-Icon-Band einklappbar. Der Knopf zum Ein-/Ausklappen sitzt in beiden Zuständen an exakt derselben Stelle oben links. Hauptpanel eingerückt (8px), Radius 14, Ring. Inhalt von Übersicht, Bereichen und „Für mich“ max. 1440px breit, mittig (Maxi, 14.10.: Breite besser nutzen; vorher 1080px). Pipeline über die volle Breite, rechts Detail-Sheet mit 400px.
- **Sidebar:** Einklapp-Knopf + Logo · Suche (Strg K) · Übersicht, Inbox, Für mich · HACKATHON: Termine, Roadmap, Pipeline, Aufgaben, Dokumente · BEREICHE: 5 mit Bereichs-Zeichen (Ring = Fortschritt) und rechts der verantwortlichen Person als Mini-Avatar (gestrichelter Kreis = noch offen) · unten Avatar, Hell/Dunkel, Abmelden. **Klick auf den eigenen Avatar öffnet „Profil“** (auch Strg+K und Handy-Menü oben): Passwort ändern (aktuelles + neues zweimal) und Team mit „Einladen“ (Name + Mail = Eintrag in der Team-Liste, Anmeldung wie beim ersten Mal; „eingeladen“ = noch kein Konto) und Link zum Tool kopieren. Ohne Erklärtexte. Eingeklappt erscheinen die Bereichs-Zeichen ebenfalls. Kein Sound-Schalter (Maxi, 14.10.: Sounds sind immer an, auch kein Schalter in Strg+K oder im Handy-Menü).
- **Handy** (neu 15.10., Gesamtprüfung vor dem Freeze): Kopfzeile Logo · Suche · **Inbox als Glocke** mit Zähler · Avatar (Menü). Tab-Leiste: Heute · Pipeline · **+** (Akzent-Kreis 52px) · **Termine** · Aufgaben (vorher Aufgaben · Inbox; der Kalender soll sichtbar sein). Das Datum steht in der Label-Zeile der Übersicht statt in der Kopfzeile. Menü: Für mich, Roadmap, Dokumente, Bereiche, Darstellung, Feedback, Abmelden. „+“-Sheet mit eigenem Symbol je Art. Jede Seite beginnt mit `MobileTitle`: Titel links, Hauptaktion („+ Termin“, „+ Aufgabe“ …) rechts in derselben Zeile, Filter darunter in höchstens zwei Zeilen. Leerzustände sind am Handy Karten (auf dem grauen Hintergrund wäre `--card2` unsichtbar). Bottom Sheets, `env(safe-area-inset-bottom)`, Tippflächen mind. 44px, **kein Ziehen & Ablegen** (Status per Sheet).

## 6. Seiten (siehe Boards)
1. **Übersicht** (`Richtung-A-Graphit.dc.html`)
   - Keine Begrüßung (Maxi, 14.10.), stattdessen eine Label-Zeile „Mittwoch, 14. Oktober · Phase 1 von 5 · noch 4 Tage Vorbereitung“.
   - Countdown-Karte als **Live-Uhr** (Maxi, 14.10., Variante B): Tage groß in Michroma, daneben Std : Min : Sek. Jede Ziffer rollt beim Wechsel (300 ms), die Tage rollen beim Öffnen einmal hoch (0,7 s). Ziel: Sa 27.2.2027, 09:00 Wien. Screenreader hören nur die Tage. Darunter der Phasen-Stepper mit 5 Segmenten (Vorbereitung bis 18.10., Akquise bis 18.12., Bewerbung bis 22.1., Programm bis 26.2., Event 27.–28.2.; Zeitplan vom 14.10.); das aktuelle Segment füllt sich in `--accLine`.
   - Karte „Nächster Meilenstein“ mit Unterpunkten und „x von n erledigt“.
   - 4 Zielzahl-Kacheln: Track-Partner x/4, Jury x/4, Venue x/1 plus Backup, Sponsoren mit Ziel offen.
   - „Als Nächstes fällig“, gruppiert nach Tag.
   - „Heute nachfassen“ mit Leerzustand: „Noch nichts nachzufassen. Welle 1 startet am Mo, 19.10. …“, darunter die Nachfass-Runden 2.11., 16.11. und 30.11.
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
     - Eigenschaften (entschlackt 14.10.): Zuständig, Nachfassen (Datum rot/Kobalt je nach Status, +2 T und +1 W in einer Zeile), Prio, Warm über (bestehende Verbindung klein darunter, nicht bei Venues), Ansprechperson, E-Mail / Tel., Website. Venues zusätzlich Block „Eckdaten“: Kapazität, Übernachtung, Preis/Deal, Lage. Dann Notizen. Kein „Mehr“, keine Welle, keine Rollen im Detail (Maxi: nicht overengineeren). Leere Felder zeigen „–“, keine Beispieltexte. Website-Symbol im Kopf, wenn gesetzt.
     - Das Detail-Panel steht rechts über die volle Höhe unter der Kopfzeile; Tabs und Filter stehen nur über der Liste (gilt auch für Aufgaben und Dokumente).
     - „Link kopieren“ überall nur als Link-Symbol in der Ecke.
     - Verlauf aus Systemereignissen und Kommentaren
     - Kommentarfeld mit @
   - Nach einer Änderung erscheint der Hinweis „X → Stufe · Rückgängig“, 5 s, mit Ablauf-Linie. Er ersetzt Sicherheitsfragen.
4. **Befehlsleiste** (Strg+K, im Übersicht-Board klickbar)
   - Gruppen: Zuletzt · Aktionen (Neue Aufgabe C, Firma F, Entscheidung E) · Gehe zu (G R …).
   - Tastenkürzel stehen rechts in Kästchen.
   - **Suche über alles** (Welle 1, 15.10.; Platzhalter „Suchen oder Befehl …“): ab 2 Zeichen auch Firmen, Aufgaben, Termine, Dokumente (inkl. Text und Transkripte), Entscheidungen, Meilensteine (auch per Nummer „M1.2“) und Bereichs-Notizen. Wortteile genügen („Erst“ findet „Erste Bank“), mehrere Wörter müssen alle vorkommen. Reihenfolge: passende Seiten und Bereiche oben, dann Inhalts-Gruppen nach bestem Treffer (Titel vor Text), dann Darstellung, Sonstiges, Aktionen. Je Art höchstens 5 Treffer. Zeile: Symbol · Titel · rechts Stufe/Datum/Art/Nummer; steht das Wort nur im Text, darunter eine Textstelle (12,5px `--text3`, Suchwort `--text2`). Enter öffnet das Detail. Während des Ladens „Suche …“.
5. **Bereichs-Seite** (Maxi, 14.10.)
   - Oben eine Kopf-Leiste wie die Eigenschaften eines Projekts in Linear: Verantwortlich (Auswahl direkt im Feld) · Pipeline-Ziel (falls vorhanden, mit Stufen und heute/überfällig) · Meilensteine x/n · Aufgaben x/n.
   - Darunter links **Notizen** im gemeinsamen Editor (siehe 6.7; speichert von selbst nach 0,8 s bzw. beim Verlassen, zeigt „wer · wann“), rechts Meilensteine und Aufgaben. Am Handy Notizen unten.
   - Gleichzeitiges Schreiben: Wer zuletzt speichert, gewinnt. Fremde Änderungen erscheinen live, solange man selbst nicht tippt. Tippt jemand anderes, steht oben „Tim schreibt gerade …“ (Live-Anwesenheit, nichts wird gespeichert).
6. **Für mich** (Welle 1, 15.10., ersetzt „Meine Aufgaben“; `/meine-aufgaben` leitet weiter)
   - Aufbau wie die Bereichs-Seite: links der **Notizblock** (privat, Schloss + „privat“ im Kopf, nur die eigene Zeile per RLS), rechts „Meine Aufgaben“ nach Fälligkeit (Überfällig · Heute · Nächste 7 Tage · Später · Ohne Frist, Erledigte eingeklappt). Am Handy Aufgaben zuerst.
   - Klick auf eine Aufgabe öffnet das Detail rechts über die volle Höhe (wie Aufgaben-Seite), zweiter Klick schließt. „+ Aufgabe“ ist mit dir vorbelegt. Taste G M.
7. **Gemeinsamer Editor** (Tiptap, gespeichert als Markdown; `src/components/editor/`)
   - Kann Überschriften, Listen, Checklisten, Links, fett, kursiv, Zitat, Trennlinie. Kürzel wie Notion/Linear: `# `, `- `, `[ ] `, `**fett**`, `> `, `---`. Text aus Google Docs behält beim Einfügen die Struktur.
   - Markieren öffnet ein kleines Menü: Fett · Kursiv · Überschrift · Liste · Checkliste · Link · **Aufgabe** (legt die Auswahl als Aufgabe an, dir zugewiesen, im Bereich vorbelegt; der Text wird zum Link auf die Aufgabe).
   - Links öffnen per Klick (Tool-Seiten im selben Tab, alles andere im neuen Tab). Schrift 14px, am Handy 16px, Menü-Knöpfe am Handy 40px.
   - Eingesetzt in Notizblock, Bereichs-Notizen, Text-Dokumenten sowie Agenda und Notizen von Terminen. Leerzeilen-Unterschiede am Ende zählen nicht als Änderung (sonst speichert schon das Öffnen). Im Notizblock zusätzlich **Teilen** (Auswahl wird Team-Dokument).
8. **Dokumente** (Welle 1, 15.10., ersetzt „Wissen“; `/wissen` leitet weiter, Taste G D, Neu: D Dokument, E Entscheidung)
   - Eine Tabelle in der Optik der Pipeline-Tabelle: Symbol + Titel (darunter Art · Domain bzw. Größe) · Bereich · Gehört zu · Von · Geändert. Neueste oben. Wird es eng, fällt erst „Gehört zu“, dann „Bereich“ weg. Am Handy Liste.
   - Filter-Chips mit Zähler: Alle · Texte (inkl. Transkripte) · Dateien & Links · Entscheidungen; dazu Bereich und Suche (Titel, Adresse, Text).
   - Arten erkennt das Tool selbst: Google Doc/Slides/Tabelle/Formular, Drive, Figma, Canva, Notion, Luma an der Adresse, sonst „Link“; Dateien (PDF, Bild, Präsentation, Tabelle); Text; Transkript (.vtt/.srt/.txt/.md werden als Text übernommen, Zeitmarken raus); Entscheidung.
   - **Kein Pflichtformular:** Strg+V eines Links irgendwo auf der Seite legt ihn ab (Titel aus der Adresse, Detail öffnet sich zum Umbenennen), Datei auf die Seite ziehen lädt hoch (max. 50 MB, größer → Drive-Link). „+ Dokument“: Link einfügen · Text schreiben · Datei hochladen · Entscheidung festhalten.
   - Detail: Link/Datei rechts 400px mit „Öffnen ↗“ (Datei über kurzlebigen Link, 5 min), Adresse, Bereich, Gehört zu, Verlauf mit Kommentaren. Text/Transkript als breites Seitenfenster (bis 760px) mit Editor und Knopf **Vollbild**; Eigenschaften und Verlauf darunter eingeklappt.
   - **Eingebettet:** Block „Dokumente“ auf der Bereichs-Seite (rechts unter Aufgaben) und im Firmen-Detail (unter Notizen), mit Feld „Link einfügen oder Datei hierher ziehen“ und Knöpfen Text/Datei; Bereich bzw. Firma vorbelegt.
   - Daten: Tabelle `documents` (Volltext-Index Deutsch für die Suche in Schritt 5), Speicher `dokumente` (privat, nur Team). Faustregel fürs Team: „Drive speichert, das Tool findet.“
9. **Termine** (Welle 1, 15.10.; Taste G T, Neu: T)
   - Desktop **Woche** (Standard, Mo–So, Zeitraster 0–24 Uhr, 48px je Stunde, öffnet bei 8:00 bzw. dem ersten Termin) oder **Liste** (`?ansicht=liste`). Oben je Tag höchstens 2 ganztägige Markierungen (offene Meilensteine, Nachfass-Runden, nur lesen, Klick führt in Roadmap/Pipeline), sonst „+n weitere“. Unterpunkte, die am selben Tag wie ihr Meilenstein fällig sind, stehen nicht extra da (M1 enthält M1.1–M1.4).
   - **Handy (15.10.): Wochenleiste + Agenda** (`mobile-week.tsx`). Oben klebt die Leiste: Monat, „Nur meine“, „Heute“ (nur außerhalb der aktuellen Woche), Pfeile; darunter Mo–So mit Datum (heute im Kobalt-Kreis), Punkten je Termin (Bereichsfarbe, max. 3) und einer Raute für Meilenstein/Nachfass-Runde. Tippen auf einen Tag springt zu ihm, Wischen wechselt die Woche. Darunter die Woche Tag für Tag: Ganztägiges zuerst (Raute + Nummer), dann Termine wie in der Liste. Freie Tage hintereinander werden eine Zeile („Fr, 16.10. – Sa, 17.10. frei“), vergangene freie Tage fallen weg. Unter der Woche „Danach“ mit den nächsten 5 Terminen. Heute: Kobalt-Kreis um die Zahl, leicht getönte Spalte, Jetzt-Linie in `--accLine`.
   - Termin-Block: links 3px Bereichsfarbe, Fläche 13 % Bereichsfarbe auf `--card` (ohne Bereich `--card2`), Titel + Uhrzeit, Video-Symbol bei Meet-Link. Überschneidende Termine stehen nebeneinander.
   - **Verschieben (Maxi, 15.10.):** Termin mit der Maus ziehen verschiebt ihn (15-min-Raster, auch auf einen anderen Tag der Woche), unteren Rand ziehen ändert die Dauer; Vorschau gestrichelt, Original halb durchsichtig. Danach Hinweis „Jetzt … Google-Termin auch anpassen.“ mit Rückgängig. Ein Klick ohne Ziehen öffnet das Detail. Am Handy kein Ziehen (Ändern im Detail).
   - **Anlegen:** Ziehen über die Zeit (15-min-Raster) oder Klick auf eine freie Stelle (1 h), „+ Termin“ bzw. Taste T. Nötig sind nur Titel und Zeit; Wer (vorbelegt du, „Ganzes Team“) und Bereich freiwillig. Kein Meet-Link beim Anlegen.
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
- **Kein Schalter** (Maxi, 14.10.). Sounds sind immer an, stumm geht über das Gerät. Die Präsenz des früheren Fun-Modus ist jetzt Standard (Maxi, 14.10. abends: „zu wenig Sound“). Die Tabelle `user_settings` bleibt ungenutzt in der Datenbank.
- Der Ton ist nie das einzige Feedback.
- Das iPhone darf über den Stummschalter stummschalten (nicht umgehen).

## 8. Barrierefreiheit
Echte `<button>`/`<a>`/`<label>`. Icon-Knöpfe mit `aria-label`. Status nie allein über Farbe: Punkt plus Wort, bei Fix ein Haken, bei Abgesagt ein Kreuz. Dialoge halten den Fokus und geben ihn zurück (shadcn/Base UI erledigt das).
