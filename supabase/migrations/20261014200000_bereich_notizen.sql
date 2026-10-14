-- Notizen je Bereich (Maxi, 14.10.): ein freies Textfeld als Ablage für alles rund um das Teilprojekt.
-- Zugriff regeln die bestehenden RLS-Regeln der Tabelle areas (Team liest und bearbeitet).
alter table public.areas
  add column if not exists notes text not null default '',
  add column if not exists notes_updated_at timestamptz,
  add column if not exists notes_updated_by uuid references public.people (id) on delete set null;
