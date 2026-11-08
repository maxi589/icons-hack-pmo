-- Termine: eigenes Feld „Ziele“ (8.11., Maxi: „klare Ziele für den Tag bzw. das Meeting“), Markdown wie Agenda und Notizen.
-- Personen taggen (@) in Bereichs-Notizen: Inbox-Einträge können jetzt auch auf einen Bereich zeigen.
-- Nur neue Spalten und ein neuer Wert: Die laufende App-Fassung bleibt davon unberührt.

alter table public.meetings add column if not exists goals text not null default '';
alter table public.meetings add column if not exists goals_updated_at timestamptz;
alter table public.meetings add column if not exists goals_updated_by uuid references public.people (id) on delete set null;

alter type public.target_type add value if not exists 'area';
