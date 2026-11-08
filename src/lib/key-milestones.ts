// Meilensteine, an denen die App rechnet: Phasen im Countdown, Zielzahlen-Kacheln, Plan-Balken, Welle 1, Event.
// Nummern seit 8.11. laut Excel „Meilensteine Hackathon Stand 8.11.2026“ (Maxi D). Wer die Roadmap neu nummeriert,
// ändert nur diese Datei. Fehlt ein Meilenstein (gelöscht), greifen die festen Rückfall-Daten in phases.ts / roadmap.ts.
export const KEY = {
  /** Outreach ready: Ende der Phase Vorbereitung */
  prep: "M1",
  /** Venue fixiert: Kachel „Venue“ */
  venue: "M3",
  /** Alle Partner und Sponsoren fixiert: Ende der Phase Akquise, Kachel „Track-Partner“ */
  partners: "M4",
  /** Welle 1: Start des Outreach */
  wave1: "M4.1",
  /** Welle 3 Sponsoren: Beginn des Sponsoren-Balkens */
  sponsorWave: "M4.3",
  /** Jury fixiert: Kachel „Jury“ */
  jury: "M5",
  /** Event public und Anmeldestart: Beginn des Bewerbungs-Balkens */
  public: "M6",
  /** Teilnehmerauswahl: Ende der Phase Bewerbung */
  selection: "M8",
  /** Hackathon: Event-Phase, Datum fest, nicht löschbar */
  event: "M9",
} as const;
