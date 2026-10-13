# soundcn: Sound-Auswahl (13.10.2026)

**Entscheidung Maxi:** Umfang „Standard“, siehe `design/Design-System.md` Abschnitt 7.
Maxis Favoriten (selbst probegehört): click-003 / click-soft (byte-identisch), drop-002, drop-003, maximize-006, maximize-008, switch-006.

## Aufbau [G/M]
- Gesamtliste: `https://soundcn.xyz/r/registry.json` (816 Einträge, 813 Sounds). Einzeln: `https://soundcn.xyz/r/<name>.json`.
- Installation: `npx shadcn add @soundcn/use-sound @soundcn/<name>`. Der Hook muss einmal ausdrücklich mitinstalliert werden. `@soundcn` steht im offiziellen shadcn-Registry-Verzeichnis, ein Eintrag in components.json ist nicht nötig. Importpfad nach der Installation prüfen (`@/sounds/<name>` oder `@/lib/soundcn/...`).
- Jeder Sound ist ein .ts-Modul mit `dataUri: "data:audio/mpeg;base64,…"`, MP3 mono, ca. 64 kbit/s.
- Hook: `const [play, {stop, pause, isPlaying, duration}] = useSound(sound, {volume, playbackRate, interrupt, soundEnabled, …})`. Ohne React gibt es `playSound(dataUri, opts)`.
- Schwächen des Hooks: kein globaler Lautstärke- oder Stumm-Schalter; jede Instanz dekodiert selbst; der erste Klick kann stumm bleiben. Daher ein eigener `SoundProvider` (Details im Design-System).

## Lizenz [G/M]
- Repo MIT. Audio aus Kenney-Sammlungen, CC0 (Interface Sounds, Impact, Music Jingles u. a.).
- **WoW-Sammlung (110 Sounds, Blizzard) ist in der Registry enthalten und fälschlich als „Kenney / CC0“ markiert.** Einziger verlässlicher Filter ist die Kategorie `warcraft`. Diese Sounds nie installieren.

## Messwerte der gewählten Sounds [M] (im Browser dekodiert)
| Sound | Dauer hörbar | Einsatz (Attack) | Helligkeit | KB | Moment |
|---|---|---|---|---|---|
| confirmation-001 | 290 ms | 2 ms | 544 Hz, steigend D5→G5→D6 | 4,1 | Aufgabe erledigt |
| confirmation-004 | 490 ms | 77 ms, weich | 1,2 kHz, Glockenspiel | 6,0 | Deal Zugesagt/Fix |
| jingles-pizzi-10 | 797 ms | 39 ms | 395 Hz, löst auf | 9,3 | Meilenstein |
| drop-002 / drop-003 | 85 / 87 ms | 0,5 ms | 803 / 731 Hz, warm | 3,0 | Karte ablegen |
| maximize-008 / minimize-008 | 225 ms | 29 / 53 ms, weich | 346 Hz | 3,3 | Strg+K |
| click-003 | 7 ms | 0,5 ms | 967 Hz | 1,1 | Klick (Fun) |
| switch-006 | 130 ms (Datei 608 ms, Rest Stille) | 2,5 ms | 324 Hz | 7,4 | Schalter (Fun) |
| click-002 | 12 ms | 0,5 ms | 297 Hz | 1,1 | Tippen (Fun) |
| question-002 | 333 ms | 47 ms | 751 Hz, Ding-Dong | 4,4 | Erwähnung |
| error-008 | 139 ms | 16 ms | 422 Hz, leise | 2,5 | Fehler |

Alternativen auf dem Sound-Board: maximize-006 / minimize-006, maximize-009, jingles-pizzi-16, confirmation-002, jingles-steel-10, jingles-pizzi-02, impact-generic-light-002, question-004, back-002, error-007, click-005, select-002, switch-007.
Die Pegel der Dateien unterscheiden sich um bis zu 11 dB. Deshalb die Startlautstärken aus der Tabelle im Design-System nehmen und nach Gehör feinjustieren.

## Ausgeschlossen [M/E]
- 8-Bit- und Game-Sounds (Digital Audio, NES).
- Sax-Jingles.
- Casino-Karten (Stille am Anfang).
- Helle Sounds wie open-*, close-*, toggle-003, click-004, tick-001 (5–10 kHz).
- error-002 (schrill); error-005/006 (auf Laptops kaum hörbar).
