-- Roadmap-Cockpit (16.10.): Datum, Titel und Beschreibung eines Meilensteins sind jetzt im Tool änderbar.
-- Basisdatum = ursprünglich geplantes Datum, daraus zeigt das Detail „verschoben +X T“. Einmal mit dem heutigen Stand befüllt.
alter table public.milestones add column if not exists baseline_due date;
update public.milestones set baseline_due = due_date where baseline_due is null;
