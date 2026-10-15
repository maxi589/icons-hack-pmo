-- Feedback-Knopf (Plan Welle 1, Schritt 4): Rückmeldungen aus dem Team mit Bildschirmfoto und technischem Kontext.
-- Landet in der Inbox von Maxi S (Art „feedback“). Bei „umgesetzt“ bekommt die absendende Person „feedback_done“.

-- Inbox-Einträge und Verlauf können jetzt auch an einem Feedback hängen.
alter type public.target_type add value if not exists 'feedback';
alter type public.notification_kind add value if not exists 'feedback';
alter type public.notification_kind add value if not exists 'feedback_done';

create table if not exists public.feedback (
  id              uuid primary key default gen_random_uuid(),
  author_id       uuid references public.people (id) on delete set null default public.current_person_id(),
  body            text not null check (length(trim(body)) > 0),
  kind            text check (kind in ('fehler', 'idee', 'sonstiges')),   -- freiwillig
  status          text not null default 'offen' check (status in ('offen', 'umgesetzt', 'verworfen')),
  page            text not null default '',                              -- Adresse inkl. offenem Detail
  context         jsonb not null default '{}',                           -- Fenster, Gerät, hell/dunkel, Version, Fehler, Stelle
  screenshot_path text,                                                  -- Bild im Speicher „feedback“
  resolved_by     uuid references public.people (id) on delete set null,
  resolved_at     timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists feedback_status_idx on public.feedback (status, created_at desc);

alter table public.feedback enable row level security;
drop policy if exists "Team bearbeitet Feedback" on public.feedback;
create policy "Team bearbeitet Feedback" on public.feedback
  for all to authenticated using ((select public.is_team_member())) with check ((select public.is_team_member()));
revoke all on public.feedback from anon;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'feedback') then
    alter publication supabase_realtime add table public.feedback;
  end if;
end $$;

-- Bildschirmfotos: privat, nur fürs Team, höchstens 5 MB pro Bild
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('feedback', 'feedback', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "Team liest Feedback-Bilder" on storage.objects;
create policy "Team liest Feedback-Bilder" on storage.objects
  for select to authenticated using (bucket_id = 'feedback' and (select public.is_team_member()));
drop policy if exists "Team lädt Feedback-Bilder hoch" on storage.objects;
create policy "Team lädt Feedback-Bilder hoch" on storage.objects
  for insert to authenticated with check (bucket_id = 'feedback' and (select public.is_team_member()));
