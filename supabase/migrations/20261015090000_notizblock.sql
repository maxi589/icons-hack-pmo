-- Privater Notizblock je Person (Plan Welle 1, Seite „Für mich“): eine Zeile pro Person, Text als Markdown.
-- Nur die Besitzerin bzw. der Besitzer liest und schreibt (RLS), auch für das restliche Team unsichtbar.
create table if not exists public.notepads (
  person_id  uuid primary key references public.people (id) on delete cascade,
  content    text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.notepads enable row level security;

drop policy if exists "Eigener Notizblock" on public.notepads;
create policy "Eigener Notizblock" on public.notepads
  for all to authenticated
  using (person_id = (select public.current_person_id()))
  with check (person_id = (select public.current_person_id()));

revoke all on public.notepads from anon;

-- Live-Updates (gleicher Notizblock auf Handy und Laptop). Realtime beachtet RLS, andere sehen nichts.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'notepads') then
    alter publication supabase_realtime add table public.notepads;
  end if;
end $$;
