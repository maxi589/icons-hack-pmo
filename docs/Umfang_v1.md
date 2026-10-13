# icons Hackathon PMO-Tool: Umfang v1

> **Änderungen seit der Freigabe (Stand 13.10.2026, nach Design-Session und Prüfschleife)**: Diese Punkte gehen dem Text unten vor.
> - **Login:** 6-stelliger Code per Mail statt Link, weil Mail-Scanner Links verbrauchen. Mailversand vorerst über ein eigenes Gmail-Konto per SMTP; Resend erst, wenn eine eigene Domain steht. Details in `Konten-Anleitung.md`.
> - **Technik:** shadcn/ui mit **Base UI** (nicht Radix), Tailwind v4, Next.js, Supabase, Vercel. Kanban aus **Kibo UI** (dnd-kit core 6.3.1). Zeitstrahl selbst gebaut. Schrift Geist über das npm-Paket. Details in `design/Design-System.md`.
> - **Design:** Richtung „Graphit“ + Akzent **Lime** + Countdown in **Michroma** + Sounds **„Standard“**. Hell und dunkel gleichwertig, Standard = Systemeinstellung. Keine icons-Farben.
> - **Pipeline-Typen:** Laut Partner-Liste v1 Rolle als Mehrfachauswahl (Challenge · Sponsor · Jury · Tokens/Credits), Venues eigene Liste, Feld „Bestehender Kontakt“ (TE/Coop). Details in `daten/Partner-Liste-v1_Analyse.md`.
> - **Handy:** vier Kernaufgaben (Nachfassen abhaken/verschieben, Status per Sheet, Kommentar mit @, Inbox), Tab-Leiste mit „+“, kein Ziehen & Ablegen.
> - **Zeitplan:** Design-Freeze am **24.10.** Zeitzone Europe/Vienna, Nachfass-Termine als reines Datum (Sommerzeit endet 25.10.).
> - **Nicht in v1:** animierte Sidebar, Glas-Effekte, virtualisierte Tabelle, Ziehen im Zeitstrahl.

## Kontext
Das Orga-Team des icons Hackathons (27./28.2.2027, 24 h) stimmt sich heute über WhatsApp ab. Dabei gehen Aufgaben, Entscheidungen und vor allem der Stand des Outreachs unter. Ziel ist ein eigenes, schlankes Web-Tool mit einer gemeinsamen Übersicht über Meilensteine, Aufgaben und Outreach zu Partnern, Sponsoren, Venues und Jury. Vorbilder: Linear (Tempo, Klarheit) und ClickUp (mehrere Ansichten).

**Rahmen (von Maxi bestätigt am 13.10.2026)**
- Nutzer: 5 Personen (Maxi S, Maxi D, Manu, Tim, Kilian). Keine Rollen, alle dürfen alles.
- Pipeline (CRM) ist das Kernstück: Partner, Sponsoren und Venues. Jury kommt dazu (mein Vorschlag, gleiche Mechanik).
- Teilprojekte sind die Bereiche aus der Excel. Die Verantwortlichen sind noch offen, das Tool soll offene Zuständigkeiten sichtbar machen.
- v1 läuft im Team bis **ca. 30.10.**, also vor der ersten Nachfass-Runde am 2.11.

**Grundlage** (gelesen aus `Hackathon_Meilensteine.xlsx`): 18 Meilensteine (M1–M8 mit Unterpunkten), 8 Bereiche, Deadlines vom 18.10.2026 bis 27.2.2027. Zielzahlen aus den Beschreibungen: 4 Challenge-Partner, 4 Jurymitglieder, 1 Venue plus Backup, 3 Outreach-Wellen mit Nachfass-Terminen am 2.11., 16.11. und 30.11.

## Umfang v1

| Bereich | Inhalt |
|---|---|
| **Übersicht** (Startseite) | Countdown bis zum Hackathon (heute noch 137 Tage), aktuelle Phase, nächster Meilenstein, **Zielzahlen** (Partner 0/4 · Jury 0/4 · Venue 0/1), „Heute nachfassen“, „Diese Woche fällig“, „Meine Aufgaben“, Bereiche ohne Verantwortliche |
| **Roadmap** | Zeitstrahl Okt–Feb mit Heute-Linie, Meilensteine mit Status (offen / läuft / erledigt / verzögert), Unter-Meilensteine aufklappbar, Klick öffnet zugehörige Aufgaben |
| **Pipeline** (CRM) | Je ein Board für Partner, Sponsoren, Venues und Jury. Stufen: Recherche → Kontaktiert → Im Gespräch → Zugesagt → Fix · Abgesagt. Felder: Prio A/B, Welle, Ansprechperson, warmer Kontakt (wer aus icons kennt wen), zuständige Person, nächstes Nachfassen. Typ-Felder: Venue (Kapazität, Übernachtung, Lage, Preis), Sponsor (Art: Credits, Verpflegung, Geld). Überfälliges Nachfassen wird rot markiert. Import aus Excel/CSV |
| **Aufgaben** | Board und Liste, Filter nach Bereich, Person und Meilenstein. Felder: Titel, Status, zuständige Person, Fälligkeit, Bereich, Meilenstein |
| **Bereiche** | 7 Teilprojekte (Partner, Sponsoren, Venue, Marketing, Jury, Teilnehmer, Event), je mit verantwortlicher Person, Fortschritt, Meilensteinen und Aufgaben |
| **Zusammenarbeit** | Kommentare mit @Erwähnung an Aufgaben, Firmen und Meilensteinen. Eine Inbox für Erwähnungen und Zuweisungen, dazu eine E-Mail an die betroffene Person. Jeder Eintrag hat einen eigenen Link, den man in WhatsApp posten kann |
| **Wissen** | Entscheidungs-Log (was, wann, wer, warum, verknüpft mit dem Thema) und Linksammlung (Pitch Deck, Website, Luma) |
| **Grundlagen** | Login per E-Mail-Link, gute Handy-Ansicht, Suche und Befehlsleiste mit Strg+K (wie bei Linear), Änderungen der anderen erscheinen sofort |

**Später (v2, Nov–Jan):** Kalender-Abo (iCal-Link für Google oder Outlook, nur lesend), Ablaufplan für den Event-Tag, Budget, Vorlagen für Outreach-Mails, Wochenrückblick per Mail.

**Bewusst nicht dabei:** eigener Chat (verliert gegen WhatsApp), Teilnehmerverwaltung (macht Luma), Zwei-Wege-Kalender-Sync, WhatsApp-Bot (braucht die kostenpflichtige Meta-Business-Schnittstelle).

**Teamregel zum Start:** WhatsApp bleibt für den schnellen Austausch. Was nicht im Tool steht, gilt nicht als vereinbart.

## Designprinzipien (Details in der Design-Session)
- Linear-Gefühl: schnell, ruhig, klare Typografie, dezente Animationen, Hell- und Dunkelmodus, Bedienung per Tastatur.
- Von ClickUp nur die Idee, dieselben Daten in mehreren Ansichten zu zeigen (Board, Liste, Zeitstrahl). Keine Feature-Flut.
- Jede Seite beantwortet in 5 Sekunden: Wo stehen wir? Was ist als Nächstes dran? Wer ist zuständig?

## Technik (Vorschlag, wird nach der Design-Session entschieden)
- Next.js (Web-App) + Supabase (Datenbank, Login, Live-Updates) + Vercel (Hosting) + Resend (E-Mails). Für 5 Personen reichen die Gratis-Stufen, also 0 €.
- Maxi legt die Konten selbst an: GitHub, Vercel, Supabase, Resend.
- Code-Repo **außerhalb von OneDrive**: GitHub-Repo `icons-hack-pmo`, lokal unter `C:\Users\maxis\dev\icons-hack-pmo`. Der Projektordner in OneDrive bleibt für Unterlagen, `_STATUS.md` und `_UEBERGABE.md`.
- Die Meilensteine werden einmal aus der Excel ins Tool übernommen. Danach ist das Tool die einzige Quelle.

## Ablauf bis 30.10.
1. **13./14.10.** Umfang fix (dieses Dokument). `_STATUS.md` und `_UEBERGABE.md` im Projektordner anlegen. Die Excel in strukturierte Startdaten umwandeln.
2. **14.–16.10. Design-Session:** Maxi zeigt seine Inspirationen. Ich baue einen klickbaren Prototyp mit den echten Meilensteinen und Beispiel-Firmen, danach 1–2 Feedbackrunden.
3. **17.–26.10. Bau v1** in dieser Reihenfolge: Login, Datenmodell und Import → Roadmap und Übersicht → Pipeline → Aufgaben und Kommentare → Benachrichtigungen.
4. **27.–29.10.** Echte Lead- und Venue-Liste importieren. Test mit echten Daten. Ein Teammitglied testet am Handy.
5. **30.10.** Go-live mit 15 Minuten Einführung im Team. Am 2.11. läuft die erste Nachfass-Runde über das Tool, das ist der echte Test.

## Offene Punkte für die Design-Session
- Wo liegen die Lead- und Venue-Liste (Excel, Google Sheets)? Welche Spalten haben sie? Das bestimmt den Import.
- Visuelle Inspirationen (Websites), icons-Branding (Logo, Farben), Name des Tools.
- Hinweise zur Excel (Annahme, Maxi klärt das im Team): Die Anmeldung ist nur 16 Tage offen (5.–21.2.). Zwischen Zusage und Event liegen nur 4 Tage (23.–27.2.). Es fehlen Meilensteine für Teilnehmer-Marketing, für die Challenges mit den Partnern, für Budget und für Preise.

## Prüfung („fertig“ = mit echten Daten geprüft)
- Alle 18 Meilensteine stehen mit dem richtigen Datum in der Roadmap (Abgleich Zeile für Zeile mit der Excel).
- Nach dem Import der echten Lead-Liste stimmt die Zahl der Firmen mit der Quelle überein, Stichprobe von 5 Firmen Feld für Feld.
- Eine @Erwähnung kommt als E-Mail an. Eine Zuweisung erscheint in der Inbox.
- Ein überfälliges Nachfass-Datum erscheint rot auf der Übersicht.
- Handy-Check aller Hauptseiten. Zwei Teammitglieder arbeiten einen Tag lang echt damit.
