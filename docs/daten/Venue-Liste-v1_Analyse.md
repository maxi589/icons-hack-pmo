# Venue-Liste v1: Auswertung für den Import

**Quelle:** `Venue_Tracker_Hackathon_2027.xlsx`, Blatt „Venue Tracker“ (Zeilen 5–25) und Blatt „Listen“ (Dropdowns). Ausgelesen am 13.10.2026 mit `werkzeuge/read-xlsx.js`, Zahlen per Skript gezählt (gemessen).

## Inhalt
- **21 Venues** in den Zeilen 5–25. Zeile 26 („TUtheSky“, ohne weitere Angaben) ist ein Duplikat von Zeile 7 (TU Wien) und wird **nicht importiert**.
- Prio: A 6 · B 8 · C 7 (Legende: A = diese Woche anfragen, B = nächste Woche, C = nur, wenn A/B nicht klappen)
- Owner: Tim 12 · Maxi 5 · icons Cooperations 4
- Status: alle 21 „Offen“
- Deadline (Erstanfrage bis): 14.10.2026 bei 6 Venues (genau die mit Prio A) · 21.10. bei 8 (Prio B) · 28.10. bei 7 (Prio C). Die Excel speichert Datumszahlen: 46309 = 14.10.2026, 46316 = 21.10., 46323 = 28.10.

## Entscheidungen (Maxi, 13.10.)
- **Event-Datum ist 27./28.2.2027.** Die Kopfzeile der Venue-Excel („26.–27.02.2027“) ist falsch.
- **Owner „Maxi“ = Maxi S.**
- **Schlank importieren:** kein Feld „Nutzung“, keine Aufteilung in Hack-Venue und Finale-Venue. Zielkachel bleibt „Venue x/1 plus Backup“.
- Ebenfalls weggelassen (Vorschlag Claude, gleiche Logik): **Bucket** Safe/Riskant. Die Spalte „Kommentar“ bleibt als Notiz, sie beschreibt ohnehin, wofür ein Ort taugt.

## Import-Zuordnung
| Excel | Tool |
|---|---|
| Venue | Name. Adresse in Klammern → Lage, z. B. „HOIV Home of Innovation“ + Lage „Arsenalstr. 11, 1030“ |
| Prio | Prio (A/B/C) |
| Owner | zuständig: Maxi → Maxi S, Tim → Tim. „icons Cooperations“ → leer, dafür Warmer Kontakt „icons Cooperations“ |
| Status | Stufe: Offen → Recherche · Angefragt → Kontaktiert · Im Gespräch und Besichtigung → Im Gespräch · Zusage → Zugesagt · Absage und Verworfen → Abgesagt |
| Deadline | nächstes Nachfassen (reines Datum) |
| Kapazität | Kapazität (Text) |
| Übernachtung | Übernachtung (Text, z. B. „Ja (24h offen, Duschen)“) |
| Kosten / Deal | Preis / Deal (Text) |
| Kontakt | Kontaktinfo. Platzhalter wie „Unklar“ → leer |
| URL | Link |
| Kommentar / Nächster Schritt | Notiz |
| Bucket, Nutzung | **nicht übernommen** |

Bis zum Go-live (30.10.) arbeitet das Team weiter in der Excel. Import am 27.–29.10. mit dem dann aktuellen Stand.
