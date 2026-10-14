-- Aufbau-Check 14.10.2026 (Chat 7): 5 Bereiche statt 7, Bewerbungsfenster vor der Prüfungszeit,
-- fehlende Meilensteine, erste Einträge im Entscheidungs-Log. Darf zweimal laufen.

begin;

-- 1. Bereiche: Event → Venue & Event, Teilnehmer → Marketing & Teilnehmer, Jury → Programm & Jury.
--    IDs bleiben (Links, Filter), sichtbar sind nur die Namen. Reihenfolge = Ablauf.
update public.milestones set area_id = 'venue'     where area_id = 'event';
update public.milestones set area_id = 'marketing' where area_id = 'teilnehmer';
update public.tasks      set area_id = 'venue'     where area_id = 'event';
update public.tasks      set area_id = 'marketing' where area_id = 'teilnehmer';
update public.decisions  set area_id = 'venue'     where area_id = 'event';
update public.decisions  set area_id = 'marketing' where area_id = 'teilnehmer';
update public.links      set area_id = 'venue'     where area_id = 'event';
update public.links      set area_id = 'marketing' where area_id = 'teilnehmer';
delete from public.areas where id in ('event', 'teilnehmer');

update public.areas set name = 'Venue & Event',          sort = 1 where id = 'venue';
update public.areas set name = 'Track-Partner',          sort = 2 where id = 'partner';
update public.areas set name = 'Sponsoren',              sort = 3 where id = 'sponsoren';
update public.areas set name = 'Programm & Jury',        sort = 4 where id = 'jury';
update public.areas set name = 'Marketing & Teilnehmer', sort = 5 where id = 'marketing';
update public.areas set name = 'Gesamtleitung',          sort = 0 where id = 'vorbereitung';

-- 2. Bestehende Meilensteine: Texte schärfen, Bewerbung vor Prüfungszeit und Semesterferien.
update public.milestones set description = '4 Track-Partner vertraglich zugesagt (= 4 Tracks), Prize Pool steht, Sponsoren für Credits und Verpflegung fix.' where id = 'M3';
update public.milestones set description = '4 externe Finaljuror:innen zugesagt (Gründer:innen, Investor:innen). Juror:innen der Track-Partner zählen nicht dazu.' where id = 'M4';
update public.milestones set title = 'Event public und Bewerbungsstart (Luma)', due_date = '2026-11-30',
  description = 'Luma-Event und Website live, ab jetzt kann man sich bewerben. Partner werden laufend bekanntgegeben.' where id = 'M5';
update public.milestones set title = 'Bewerbungsschluss', due_date = '2027-01-17',
  description = 'Bewerbung geschlossen, vor der Prüfungszeit. Ziel 200 Bewerbungen.' where id = 'M6';
update public.milestones set due_date = '2027-01-22',
  description = '~120 Zusagen und Warteliste raus. Bestätigung bis So 31.1., vor den Semesterferien.' where id = 'M7';

-- 3. Fehlende Meilensteine (Unterpunkt liegt vor seinem Oberpunkt, Bereich darf abweichen wie bei M1.x).
insert into public.milestones (id, parent_id, title, description, due_date, area_id, sort) values
  ('M3.4', 'M3', 'Budget und Vertragspartner geklärt', 'Wer unterschreibt und stellt Rechnungen, Budgetrahmen, Paketpreise. Muss vor der ersten Zusage stehen.', '2026-11-06', 'vorbereitung', 12),
  ('M8.2', 'M8', 'Behörde und Sicherheit geklärt', 'Mit der Venue klären: Übernachtung, Brandschutz, Anmeldung bei der MA 36 (ab 200 Personen gleichzeitig).', '2026-12-18', 'venue', 19),
  ('M8.3', 'M8', 'Programm steht', 'Ablauf fix, Mentor:innen eingeteilt, Pitch-Coaching geplant.', '2027-02-12', 'jury', 20),
  ('M8.4', 'M8', 'Helfer eingeteilt', '10–12 Helfer mit Schichtplan für die 24 Stunden.', '2027-02-12', 'venue', 21),
  ('M8.5', 'M8', 'Track-Briefings final', 'Alle 4 Challenges final, eine Woche vor dem Event.', '2027-02-19', 'partner', 22),
  ('M8.6', 'M8', 'Teilnahme bestätigt', 'Absagen durch die Warteliste ersetzt, Teams stehen.', '2027-02-19', 'marketing', 23)
on conflict (id) do nothing;

update public.milestones set sort = 13 where id = 'M4';
update public.milestones set sort = 14 where id = 'M5';
update public.milestones set sort = 15 where id = 'M6';
update public.milestones set sort = 16 where id = 'M7';
update public.milestones set sort = 17 where id = 'M8';
update public.milestones set sort = 18 where id = 'M8.1';

-- 4. Erste Einträge im Entscheidungs-Log (Wissen), entschieden von Maxi S am 14.10.
insert into public.decisions (title, reason, decided_on, decided_by, area_id, target_type, target_id, created_by)
select d.title, d.reason, '2026-10-14', array[p.id], d.area_id, d.target_type::public.target_type, d.target_id, p.id
from public.people p,
(values
  ('Bewerbung 30.11.–17.1., Auswahl 22.1.',
   'Vor Prüfungszeit und Semesterferien (TU ab 29.1.), 5 Wochen Vorlauf für Anreise. Weicht von der Excel ab (5.2.–23.2.).',
   'marketing', 'milestone', 'M5'),
  ('5 Bereiche statt 7, eine Person je Bereich',
   'Venue & Event, Track-Partner, Sponsoren, Programm & Jury, Marketing & Teilnehmer. Budget und Verträge bei der Gesamtleitung.',
   null, null, null),
  ('Partner-Begriffe wie auf der Website',
   'Track-Partner, Tech-Partner, Supporter, Jury & Ecosystem. VCs und Ecosystem-Partner laufen unter Jury & Ecosystem, ein Eintrag pro Firma.',
   'partner', null, null),
  ('Venue bis 30.11., Partner bis 18.12. bleiben',
   'Venue im Sep–Okt (Vorstands-Roadmap) ist nicht mehr erreichbar. Venue-Anfragen laufen parallel zu Welle 1.',
   'venue', 'milestone', 'M2')
) as d(title, reason, area_id, target_type, target_id)
where p.name = 'Maxi S'
  and not exists (select 1 from public.decisions x where x.title = d.title);

commit;

select (select count(*) from public.areas) as bereiche, (select count(*) from public.milestones) as meilensteine, (select count(*) from public.decisions) as entscheidungen;
