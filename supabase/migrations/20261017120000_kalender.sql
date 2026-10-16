-- Kalender-Sync (17.10.): private Termine („Nur für mich“) und eine Meldung an /api/kalender bei jeder Änderung.
-- Plan: OneDrive „Plan_Kalender-Sync.md“. Das Tool schreibt daraufhin je Person einen Google-Kalender „hack-vienna HQ“.
-- Reihenfolge beim Einspielen: erst diese Migration, dann den Code ausliefern (der Code liest meetings.private_for).

-- 1) Private Termine: private_for = die eine Person, die ihn sieht. null = ganzes Team (Standard).
--    Wie beim Notizblock regelt das die Datenbank selbst: Für alle anderen gibt es den Termin nicht (auch nicht in Suche und Live-Updates).
--    Privat stellen darf nur, wer den Termin angelegt hat. Sonst könnte man einen Team-Termin für alle anderen verschwinden lassen.
alter table public.meetings add column if not exists private_for uuid references public.people (id) on delete cascade;

drop policy if exists "Team bearbeitet Termine" on public.meetings;
create policy "Team bearbeitet Termine" on public.meetings
  for all to authenticated
  using ((select public.is_team_member()) and (private_for is null or private_for = (select public.current_person_id())))
  with check (
    (select public.is_team_member())
    and (private_for is null or (private_for = (select public.current_person_id()) and created_by = (select public.current_person_id())))
  );

-- 2) Meldung an das Tool: nach jeder Änderung an Terminen oder Meilensteinen ein Anruf an /api/kalender.
--    Nur bei Feldern, die in Google stehen (Agenda und Notizen speichern beim Tippen und lösen nichts aus).
--    Der Anruf trägt ein Geheimnis aus dem Vault; das Tool prüft es über kalender_secret_ok (nur mit dem geheimen Schlüssel aufrufbar).
create extension if not exists pg_net;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'kalender_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(24), 'hex'), 'kalender_secret');
  end if;
end $$;

create or replace function public.kalender_secret_ok(token text) returns boolean
language sql security definer set search_path = '' as $$
  select exists (select 1 from vault.decrypted_secrets where name = 'kalender_secret' and decrypted_secret = token);
$$;
revoke all on function public.kalender_secret_ok(text) from public, anon, authenticated;
grant execute on function public.kalender_secret_ok(text) to service_role;

create or replace function public.kalender_anstossen() returns void
language plpgsql security definer set search_path = '' as $$
declare
  secret text;
begin
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'kalender_secret';
  if secret is not null then
    perform net.http_post(
      url := 'https://hack-vienna-hq.vercel.app/api/kalender',
      body := '{}'::jsonb,
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-hq-secret', secret),
      timeout_milliseconds := 5000
    );
  end if;
end $$;
revoke all on function public.kalender_anstossen() from public, anon, authenticated;

create or replace function public.notify_kalender() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.kalender_anstossen();
  return null;
end $$;
revoke all on function public.notify_kalender() from public, anon, authenticated;

drop trigger if exists meetings_kalender on public.meetings;
create trigger meetings_kalender
  after insert or delete or update of title, starts_at, duration_min, location, meet_url, organization_id, attendees, private_for
  on public.meetings
  for each statement execute function public.notify_kalender();

drop trigger if exists milestones_kalender on public.milestones;
create trigger milestones_kalender
  after insert or delete or update of title, due_date, status, parent_id
  on public.milestones
  for each statement execute function public.notify_kalender();

-- 3) Immer nur ein Abgleich gleichzeitig (sonst entstehen doppelte Kalender, oder ein langsamer Lauf schreibt alten Stand).
--    Kommt während eines Laufs eine Meldung, merkt sich die Zeile „dirty“ und der Lauf gleicht danach nochmal ab.
--    Der volle Lauf (mit Prüfung der Freigaben) höchstens alle 20 h, auch wenn /api/ping öfter aufgerufen wird.
--    Nur das Tool (geheimer Schlüssel) liest und schreibt diese Zeile; für angemeldete Personen ist sie unsichtbar.
create table if not exists public.kalender_sync (
  id            int primary key default 1 check (id = 1),
  running_until timestamptz,
  dirty         boolean not null default false,
  last_full     timestamptz
);
insert into public.kalender_sync (id) values (1) on conflict (id) do nothing;
alter table public.kalender_sync enable row level security;
revoke all on public.kalender_sync from anon, authenticated;

create or replace function public.kalender_start(full_run boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  ok boolean;
begin
  update public.kalender_sync
     set running_until = now() + interval '2 minutes',
         dirty = false,
         last_full = case when full_run then now() else last_full end
   where id = 1
     and (running_until is null or running_until < now())
     and (not full_run or last_full is null or last_full < now() - interval '20 hours')
  returning true into ok;
  if ok then
    return true;
  end if;
  if not full_run then
    update public.kalender_sync set dirty = true where id = 1 and running_until >= now();
  end if;
  return false;
end $$;

-- Ende eines Laufs: true = inzwischen kam eine Änderung, die Sperre bleibt und der Lauf gleicht nochmal ab.
create or replace function public.kalender_ende() returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  again boolean;
begin
  update public.kalender_sync
     set running_until = case when dirty then now() + interval '2 minutes' else null end,
         dirty = false
   where id = 1
  returning running_until is not null into again;
  return coalesce(again, false);
end $$;

revoke all on function public.kalender_start(boolean) from public, anon, authenticated;
revoke all on function public.kalender_ende() from public, anon, authenticated;
grant execute on function public.kalender_start(boolean) to service_role;
grant execute on function public.kalender_ende() to service_role;
