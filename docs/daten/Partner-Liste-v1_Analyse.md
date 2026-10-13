# Partner-Liste v1: Auswertung für den Import

**Quelle:** `Partner.xlsx`, Blatt „Partner & Sponsoren“, ausgelesen am 13.10.2026 mit `werkzeuge/read-xlsx.js` (gemessen).

## Spalten
| Spalte | Inhalt | befüllt |
|---|---|---|
| A Unternehmen | Firmenname | 93 / 93 |
| B Kategorie | Corporate 51 · Startup 26 · VC 10 · Ecosystem 6 | 93 |
| C Standort | Wien 63 · International 16 · München 8 · DACH 3 · Österreich 2 · Linz 1 | 93 |
| D Type | **Challenge 50 · Sponsor/Jury 23 · Tokens 20** | 93 |
| E Bestehender Kontakt | **TE 13 · Coop 17**, leer 63 | 30 |
| F Kontaktperson | — | 0 |
| G Kontaktinfo | — | 0 |
| H Status | „Noch nicht kontaktiert“ | 93 |
| I Owner | — | 0 |
| J Notizen | z. B. „TE 2022–2026“ (13×), „Partner bei START Hack Vienna“ (8×) | 21 |

Kombination Type × Kontakt: Challenge mit TE 13, Challenge mit Coop 9, Challenge kalt 28 · Sponsor/Jury mit Coop 8, Sponsor/Jury kalt 15 · Tokens kalt 20.

## Was das fürs Tool heißt
- **Typen anpassen:** Die Liste kennt „Tokens“ (KI- und Cloud-Credits) als eigene Gruppe und fasst „Sponsor/Jury“ zusammen. Im Tool deshalb ein Feld **Rolle (Mehrfachauswahl): Challenge · Sponsor · Jury · Tokens/Credits** statt eines festen Typs. Die Pipeline-Tabs filtern danach. Venues kommen in eine eigene Liste.
- **Warmer Kontakt:** „TE“ und „Coop“ als Art des bestehenden Kontakts übernehmen. Die konkrete Person, die den Kontakt hat, bleibt ein eigenes Feld (laut M1.2 trägt das icons-Netzwerk sie ein).
- **Prio A/B fehlt noch.** Laut M1.2 muss sie bis 18.10. stehen. Das Tool braucht das Feld, und ihr müsst es befüllen.
- **Status-Zuordnung:** „Noch nicht kontaktiert“ → Stufe **Recherche**.
- Kontaktperson, Kontaktinfo und Owner sind noch leer und werden im Tool gepflegt.
- **Import:** einmalig per Skript direkt aus der aktuellen `Partner.xlsx` (Zeilen 2–94). Danach ist das Tool die einzige Quelle.

**„TE“ = Talent Elevator**, ein früheres Event von icons (laut Maxi, 13.10.). Firmen mit „TE“ waren dort Partner. Die Jahre in den Notizen (z. B. „TE 2022–2026“) zeigen, wann. Das sind besonders warme Kontakte. Im Tool den Wert „Talent Elevator“ ausschreiben, die Jahre als Notiz übernehmen. „Coop“ = bestehende Kooperation.

## Offene Fragen an Maxi
- Kommt die Venue-Liste als eigenes Excel?
- Wo landen Prio A/B und Welle: zuerst in der Excel oder direkt im Tool?
