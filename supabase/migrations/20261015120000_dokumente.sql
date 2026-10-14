-- Dokumente statt Wissen (Plan Welle 1, Schritt 2): eine Tabelle für Links, Dateien, Texte und Transkripte.
-- Entscheidungen bleiben in public.decisions und erscheinen in der Dokumente-Liste mit. Die Tabelle links wird übernommen.

-- Kommentare, Verlauf und Inbox-Einträge können jetzt auch an einem Dokument hängen.
alter type public.target_type add value if not exists 'document';

do $$
begin
  if not exists (select 1 from pg_type where typname = 'document_kind') then
    create type public.document_kind as enum ('link', 'file', 'text', 'transcript');
  end if;
end $$;

create table if not exists public.documents (
  id          uuid primary key default gen_random_uuid(),
  kind        public.document_kind not null,
  title       text not null,
  url         text,                                  -- Link
  file_path   text,                                  -- Datei im Speicher „dokumente“
  file_name   text,
  file_size   bigint,
  mime        text,
  content     text not null default '',              -- Text/Transkript als Markdown
  area_id     text references public.areas (id) on delete set null,
  target_type text check (target_type in ('milestone', 'organization', 'task')), -- gehört zu
  target_id   text,
  created_by  uuid references public.people (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_by  uuid references public.people (id) on delete set null,
  updated_at  timestamptz not null default now(),
  -- Volltextsuche (Deutsch) für Strg+K, Schritt 5
  search      tsvector generated always as (
    to_tsvector('german', coalesce(title, '') || ' ' || coalesce(url, '') || ' ' || coalesce(file_name, '') || ' ' || coalesce(content, ''))
  ) stored
);
create index if not exists documents_search_idx on public.documents using gin (search);
create index if not exists documents_target_idx on public.documents (target_type, target_id);
create index if not exists documents_area_idx on public.documents (area_id);

alter table public.documents enable row level security;
drop policy if exists "Team bearbeitet Dokumente" on public.documents;
create policy "Team bearbeitet Dokumente" on public.documents
  for all to authenticated using ((select public.is_team_member())) with check ((select public.is_team_member()));
revoke all on public.documents from anon;

-- Bisherige Links übernehmen (nur einmal)
insert into public.documents (kind, title, url, area_id, created_by, created_at, updated_by, updated_at)
select 'link', l.title, l.url, l.area_id, l.created_by, l.created_at, l.created_by, l.created_at
from public.links l
where not exists (select 1 from public.documents d where d.kind = 'link' and d.url = l.url);

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'documents') then
    alter publication supabase_realtime add table public.documents;
  end if;
end $$;

-- Datei-Speicher: privat, nur fürs Team, höchstens 50 MB pro Datei (Grenze von Supabase Free)
insert into storage.buckets (id, name, public, file_size_limit)
values ('dokumente', 'dokumente', false, 52428800)
on conflict (id) do nothing;

drop policy if exists "Team liest Dateien" on storage.objects;
create policy "Team liest Dateien" on storage.objects
  for select to authenticated using (bucket_id = 'dokumente' and (select public.is_team_member()));
drop policy if exists "Team lädt Dateien hoch" on storage.objects;
create policy "Team lädt Dateien hoch" on storage.objects
  for insert to authenticated with check (bucket_id = 'dokumente' and (select public.is_team_member()));
drop policy if exists "Team löscht Dateien" on storage.objects;
create policy "Team löscht Dateien" on storage.objects
  for delete to authenticated using (bucket_id = 'dokumente' and (select public.is_team_member()));
