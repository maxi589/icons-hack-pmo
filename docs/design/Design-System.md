# Design-System „Graphit“: Bau-Spezifikation

**Status:** Von Maxi entschieden am 13.10.2026: **Graphit + Akzent Lime + Countdown in Michroma + Sounds „Standard“**.
**Referenz-Umsetzung:** `design/leinwand/*.dc.html`. Das sind die Boards der Leinwand https://claude.ai/artifact/EAvS67Yi6WYS5rtPRhiw7Y. Werte und Aufbau dort sind verbindlich, sofern hier nichts anderes steht.
**Alle Kontraste nachgerechnet** (WCAG-Formel) am 13.10.2026.

---

## 1. Grundsätze
- Ruhig, dicht und schnell wie Linear. Jede Seite beantwortet in 5 Sekunden: Wo stehen wir? Was ist als Nächstes dran? Wer ist zuständig?
- **Farbe nur für Bedeutung:** Pipeline-Stufen, Bereichs-Punkte, Fälligkeit. Alles andere ist neutral. Dazu kommt **ein** Signatur-Akzent (Lime).
- Hell und dunkel sind gleichwertig. **Standard = Systemeinstellung** des Geräts. Umschalter in der Sidebar unten.
- Genau zwei Wow-Momente: die große Countdown-Zahl (Michroma) und „Meilenstein erledigt“ (Animation + Sound).
- Keine icons-Farben (Wunsch von Maxi). Das Logo erscheint nur als einfarbiger Schriftzug „icons“ in Michroma.
- **Ausnahme Login-Seite (Maxi, 13.10.):** immer dunkel, Hintergrund schwarz, oben mittig ein leichter Lime-Schimmer (atmet langsam) und ein weicher Lime-Schein unter dem Mauszeiger. Login-Karte mittig und schlicht. Gilt nur dort.
- **Nicht verwenden:** Glas-Effekte, Glow (Ausnahme oben), animierte Sidebar, Kipp- und Magnet-Effekte, eigener Mauszeiger, WebGL. Außerdem keine Werte oder Code von uimaxx.ing und aicss.dev (beide untersagen KI-Nutzung).

## 2. Farb-Tokens

| Token | Dunkel | Hell | Verwendung |
|---|---|---|---|
| `--bg` | #0a0a0b | #f1f1f2 | App-Hintergrund, Sidebar |
| `--panel` | #111113 | #fbfbfb | Hauptfläche (eingerückt, Radius 14) |
| `--card` | #161618 | #ffffff | Karten (Pipeline-Karte dunkel #18181a) |
| `--card2` | #1c1c1f | #f6f6f7 | Gruppenköpfe, Leerzustände |
| `--col` | #141416 | #f4f4f5 | Kanban-Spalte |
| `--line` | rgba(255,255,255,.09) | rgba(0,0,0,.09) | Haarlinien (nur Dekoration) |
| `--line2` | rgba(255,255,255,.13) | rgba(0,0,0,.13) | Ränder von Knöpfen und Chips |
| `--field` | #6b6b72 (3,42:1) | #8e8e96 (3,25:1) | **Ränder von Eingabefeldern (mind. 3:1)** |
| `--text` | #ededee | #18181b | Haupttext |
| `--text2` | #a8a8ae (7,6:1) | #52525b | Nebentext |
| `--text3` | #8b8b93 (5,4–5,6:1) | #6b6b73 (5,1:1) | Labels, Meta (nie heller!) |
| `--hover` | rgba(255,255,255,.04) | rgba(0,0,0,.035) | Hover |
| `--active` | rgba(255,255,255,.075) | rgba(0,0,0,.06) | aktiver Eintrag |

**Status-Farben** (Text und Punkte): grau #a1a1aa / #52525b · blau #60a5fa / #1d4ed8 · amber #fbbf24 / #b45309 · grün #34d399 / #047857 · rot #f87171 / #b91c1c (jeweils dunkel / hell). Im Hellmodus nur die 700er-Töne als Text verwenden. Die 500er-Töne fallen durch (Amber 2,15:1, Grün 2,28:1).

**Signatur-Akzent Lime**

| Token | Dunkel | Hell | Wofür |
|---|---|---|---|
| `--acc` | #c6f432 | #c6f432 | Flächen: Primärknopf, „+“, Chip „heute“ |
| `--accText` | #0a0a0b (15,4:1) | #0a0a0b | Text auf Akzentfläche |
| `--accLine` | #c6f432 (14,7:1) | **#4d7c0f** (4,8:1) | dünne Linien, Icons, Text: Heute-Linie, aktive Navigation (2px links), Fortschrittsbalken, Fokusring, @Erwähnung |

Wichtig: Dünne Lime-Linien auf Weiß sind unsichtbar. Im Hellmodus deshalb immer `--accLine` nehmen.

**Bereichs-Farben** (nur als 7–8px-Punkte, nie als Text auf hell): Partner #a78bfa · Sponsoren #f472b6 · Venue #2dd4bf · Marketing #fb923c · Jury #facc15 · Teilnehmer #60a5fa · Event #f87171 · Vorbereitung #a1a1aa.

**Avatar-Farben** (Initialen #111): Maxi S #c4b5fd (MS) · Maxi D #fda4af (MD) · Manu #99f6e4 (MA) · Tim #fde68a (TI) · Kilian #bfdbfe (KI).

## 3. Schrift
- **Geist** über das npm-Paket `geist`, lokal ausgeliefert (kein Google-Fonts-Abruf, DSGVO; volle Zeichensätze, Ziffern gleicher Breite). Für Zahlen `font-variant-numeric: tabular-nums`.
- **Geist Mono:** IDs (M1.2), Daten, Abschnitts-Labels. Label-Stil: 10,5px, Großbuchstaben, Laufweite .12em, `--text3`.
- **Michroma** (Google Font, über next/font lokal einbinden): nur für den Schriftzug „icons“ und die Countdown-Zahl (Desktop 72px, Handy 46px, Laufweite 0,01em).
- Größen Desktop: Listen 13,5px · Fließtext 14px · Kartentitel 14px/600 · Seitentitel 26px/600/−0,025em · Kennzahlen 34px/500.
- Größen Handy: Text 15px · **Eingabefelder 16px** (sonst zoomt das iPhone) · Titel 21–22px.

## 4. Form, Abstand, Bewegung
- **Radien:** 8 (Navigation, kleine Elemente) · 9–10 (Knöpfe, Felder) · 12–14 (Karten, Panel) · 16 (Befehlsleiste, Dialog) · 26 (Handy-Sheet oben) · 999 (Chips)
- **Abstände:** 4 / 8 / 12 / 16 / 20 / 24 / 32
- **Schatten:** Karten-Ring `0 0 0 1px var(--line)` plus `0 1px 2px` (dunkel .35, hell .05). Befehlsleiste `0 24px 64px rgba(0,0,0,.45)`.
- **Bewegung:** Tailwind-Standard, 150ms für Hover/Farbe, 200ms für Zustandswechsel, 300ms für Öffnen/Schließen, `ease-out`. Klick-Feedback `scale(.97)`. `prefers-reduced-motion` immer respektieren.
- **Fokus:** `:focus-visible` mit 2px `--accLine` und 2px Abstand.

## 5. Layout
- **Desktop:** Sidebar 232–260px, auf ein 60px-Icon-Band einklappbar (wie im Pipeline-Board). Hauptpanel eingerückt (8px), Radius 14, Ring. Übersicht-Inhalt max. 1080px breit, mittig. Pipeline über die volle Breite, rechts Detail-Sheet mit 400px.
- **Sidebar:** Logo · Suche (Strg K) · Übersicht, Inbox, Meine Aufgaben · HACKATHON: Roadmap, Pipeline, Aufgaben, Wissen & Entscheidungen · BEREICHE: 7 mit Punkt (amber Punkt rechts = Verantwortlich offen) · unten Avatar, Sound-Schalter, Hell/Dunkel.
- **Handy:** Tab-Leiste: Heute · Pipeline · **+** (Akzent-Kreis 52px) · Aufgaben · Inbox. Bottom Sheets, `env(safe-area-inset-bottom)`, Tippflächen mind. 44px, **kein Ziehen & Ablegen** (Status per Sheet).

## 6. Seiten (siehe Boards)
1. **Übersicht** (`Richtung-A-Graphit.dc.html`)
   - Begrüßung mit Datum und Phase.
   - Countdown-Karte: Michroma-Zahl plus Phasen-Stepper mit 5 Segmenten (Vorbereitung bis 18.10., Outreach bis 18.12., Jury bis 15.1., Anmeldung bis 23.2., Event 27.–28.2.); das aktuelle Segment füllt sich in `--accLine`.
   - Karte „Nächster Meilenstein“ mit Unterpunkten und „x von n erledigt“.
   - 4 Zielzahl-Kacheln: Challenge-Partner x/4, Jury x/4, Venue x/1 plus Backup, Sponsoren mit Ziel offen.
   - „Als Nächstes fällig“, gruppiert nach Tag.
   - „Heute nachfassen“ mit Leerzustand: „Noch nichts nachzufassen. Welle 1 startet am Mo, 19.10. …“, darunter die Nachfass-Runden 2.11., 16.11. und 30.11.
   - Bereiche-Raster mit „Verantwortlich offen“ und dem Knopf „Zuständigkeiten verteilen“.
2. **Roadmap** (`Graphit-Roadmap.dc.html`)
   - Zeilen je Bereich plus Vorbereitung. Zeitachse 1.10.2026–28.2.2027 (151 Tage, Monate proportional).
   - Rauten für Meilensteine, Balken für Zeiträume: M3 vom 19.10. bis 18.12., M2 vom 19.10. bis 30.11., Sponsoren vom 16.11. bis 18.12., Anmeldung vom 5.2. bis 23.2.
   - Gestrichelte Linien für die Nachfass-Runden, Heute-Linie in Akzent.
   - Klick auf einen Meilenstein öffnet ein Detail-Panel mit Excel-Beschreibung und Unterpunkten.
   - Umschalter Zeitstrahl/Liste. Am Handy nur die Liste.
3. **Pipeline** (`Graphit-Pipeline.dc.html`)
   - Tabs je Typ, Umschalter Board/Liste, Zielbalken, Zähler „heute“ und „überfällig“.
   - Spalten: Recherche → Kontaktiert → Im Gespräch → Zugesagt → Fix · Abgesagt (schmal).
   - Karte: Initialen, Name, Prio, „warm über X · Welle n“, Nachfass-Chip (heute = Akzent, überfällig = rot), Avatar.
   - Detail-Sheet:
     - Stufe plus Primärknopf „Weiter zu ‚…‘“
     - Eigenschaften: Zuständig, Warmer Kontakt, Ansprechperson, Nachfassen mit +2 Tage und +1 Woche
     - Verlauf aus Systemereignissen und Kommentaren
     - Kommentarfeld mit @
   - Nach einer Änderung erscheint der Hinweis „X → Stufe · Rückgängig“, 5 s, mit Ablauf-Linie. Er ersetzt Sicherheitsfragen.
4. **Befehlsleiste** (Strg+K, im Übersicht-Board klickbar)
   - Gruppen: Zuletzt · Aktionen (Neue Aufgabe C, Firma F, Entscheidung E) · Gehe zu (G R …).
   - Tastenkürzel stehen rechts in Kästchen.
5. **Handy** (`Graphit-Handy.dc.html`)
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
| Klick / Schalter | `click-003` (= click-soft) / `switch-006` | 0,14 / 0,25 | Fun-Modus |
| Tippen | `click-002`, Tempo ±4 % | 0,17 | Fun-Modus |
| Erwähnung, Fehler | `question-002` / `error-008` | 0,16 / 0,55 | aus (nur bei eigenen Aktionen, nie bei eingehenden Nachrichten) |

Umsetzung:
- Ein `SoundProvider` an der App-Wurzel dekodiert alle Sounds einmal vor.
- Ein zentraler Lautstärkeregler (GainNode).
- `play("taskDone")` mit eigener Lautstärke je Moment.
- Höchstens ein Abspielen pro Sound alle 60–80ms.
- Schalter „Sounds“ und „Fun-Modus“ im Profil (in der Datenbank, nicht nur im Browser).
- Der Ton ist nie das einzige Feedback.
- Das iPhone darf über den Stummschalter stummschalten (nicht umgehen).

## 8. Barrierefreiheit
Echte `<button>`/`<a>`/`<label>`. Icon-Knöpfe mit `aria-label`. Status nie allein über Farbe: Punkt plus Wort, bei Fix ein Haken, bei Abgesagt ein Kreuz. Dialoge halten den Fokus und geben ihn zurück (shadcn/Base UI erledigt das).
