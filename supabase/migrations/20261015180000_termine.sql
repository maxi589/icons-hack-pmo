-- Termine (Plan Welle 1, Schritt 3): Team-Meetings und Partner-Calls mit Agenda, Notizen, Unterlagen und Ergebnissen.
-- Beginn ist ein echter Zeitpunkt (timestamptz), angezeigt in Europe/Vienna. Fristen bleiben reine Daten.

-- Kommentare, Verlauf, Inbox-Einträge und Entscheidungen können jetzt auch an einem Termin hängen.
alter type public.target_type add value if not exists 'meeting';

create table if not exists public.meetings (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  starts_at         timestamptz not null,
  duration_min      smallint not null default 60 check (duration_min between 5 and 1440),
  location          text,                                   -- Ort (Raum, Adresse)
  meet_url          text,                                   -- Google-Meet- oder anderer Video-Link
  area_id           text references public.areas (id) on delete set null,
  organization_id   uuid references public.organizations (id) on delete set null, -- Partner-Call: Firma aus der Pipeline
  attendees         uuid[] not null default '{}',           -- Team (people.id)
  agenda            text not null default '',               -- Markdown (gemeinsamer Editor)
  agenda_updated_at timestamptz,
  agenda_updated_by uuid references public.people (id) on delete set null,
  notes             text not null default '',               -- Markdown
  notes_updated_at  timestamptz,
  notes_updated_by  uuid references public.people (id) on delete set null,
  created_by        uuid references public.people (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- Volltextsuche (Deutsch) für Strg+K, Schritt 5
  search            tsvector generated always as (
    to_tsvector('german', coalesce(title, '') || ' ' || coalesce(location, '') || ' ' || coalesce(agenda, '') || ' ' || coalesce(notes, ''))
  ) stored
);
create index if not exists meetings_starts_idx on public.meetings (starts_at);
create index if not exists meetings_org_idx on public.meetings (organization_id);
create index if not exists meetings_search_idx on public.meetings using gin (search);

drop trigger if exists meetings_updated_at on public.meetings;
create trigger meetings_updated_at before update on public.meetings
  for each row execute function public.set_updated_at();

alter table public.meetings enable row level security;
drop policy if exists "Team bearbeitet Termine" on public.meetings;
create policy "Team bearbeitet Termine" on public.meetings
  for all to authenticated using ((select public.is_team_member())) with check ((select public.is_team_member()));
revoke all on public.meetings from anon;

-- Ergebnisse: Aufgaben aus einem Termin
alter table public.tasks add column if not exists meeting_id uuid references public.meetings (id) on delete set null;
create index if not exists tasks_meeting_idx on public.tasks (meeting_id);

-- Unterlagen: Dokumente können zu einem Termin gehören
alter table public.documents drop constraint if exists documents_target_type_check;
alter table public.documents add constraint documents_target_type_check
  check (target_type in ('milestone', 'organization', 'task', 'meeting'));

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'meetings') then
    alter publication supabase_realtime add table public.meetings;
  end if;
end $$;
