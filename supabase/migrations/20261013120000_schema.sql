-- icons Hackathon PMO: Grundschema
-- Zugriff nur für die Team-Adressen in public.people (Allowlist), über Row Level Security auf jeder Tabelle.
-- Alle Kalenderdaten (Fristen, Nachfassen) sind reine `date`-Werte und gelten in Europe/Vienna.

-- ---------------------------------------------------------------
-- Typen
-- ---------------------------------------------------------------
create type public.milestone_status as enum ('offen', 'laeuft', 'erledigt', 'verzoegert');
create type public.task_status      as enum ('offen', 'laeuft', 'erledigt');
create type public.org_stage        as enum ('recherche', 'kontaktiert', 'im_gespraech', 'zugesagt', 'fix', 'abgesagt');
create type public.org_role         as enum ('challenge', 'sponsor', 'jury', 'tokens', 'venue');
create type public.sponsor_kind     as enum ('credits', 'verpflegung', 'geld');
create type public.prio             as enum ('A', 'B', 'C');
create type public.target_type      as enum ('task', 'organization', 'milestone', 'decision');
create type public.notification_kind as enum ('mention', 'assignment');

-- ---------------------------------------------------------------
-- Hilfsfunktionen
-- ---------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------
-- Team (zugleich Allowlist)
-- ---------------------------------------------------------------
create table public.people (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,                 -- „Maxi S“
  full_name  text,
  initials   text not null,                 -- „MS“
  color      text not null,                 -- Avatar-Farbe, z. B. #c4b5fd
  email      text not null unique check (email = lower(email)),
  user_id    uuid unique references auth.users (id) on delete set null,
  sort       smallint not null default 0,
  created_at timestamptz not null default now()
);

-- true, wenn die angemeldete Person auf der Allowlist steht.
-- security definer, damit die Prüfung nicht selbst an RLS hängt.
create or replace function public.is_team_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.people p
    where p.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- people.id der angemeldeten Person
create or replace function public.current_person_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id from public.people p
  where p.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  limit 1;
$$;

-- Nach dem ersten Login das Konto mit der Person verknüpfen.
create or replace function public.link_person_on_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.people set user_id = new.id
  where email = lower(new.email) and user_id is null;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.link_person_on_signup();

-- ---------------------------------------------------------------
-- Bereiche und Meilensteine
-- ---------------------------------------------------------------
create table public.areas (
  id         text primary key,              -- 'partner', 'venue' …
  name       text not null,
  color      text not null,
  is_project boolean not null default true, -- false für „Vorbereitung“ (kein Teilprojekt)
  owner_id   uuid references public.people (id) on delete set null,
  sort       smallint not null default 0
);

create table public.milestones (
  id          text primary key,             -- 'M1.2'
  parent_id   text references public.milestones (id) on delete cascade,
  title       text not null,
  description text,
  start_date  date,                         -- nur bei Zeiträumen (Balken in der Roadmap)
  due_date    date not null,
  area_id     text not null references public.areas (id),
  status      public.milestone_status not null default 'offen',
  done_at     timestamptz,
  sort        smallint not null default 0,
  updated_at  timestamptz not null default now()
);
create trigger milestones_updated_at before update on public.milestones
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- Pipeline (Firmen, Personen für die Jury, Venues)
-- ---------------------------------------------------------------
create table public.organizations (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  roles            public.org_role[] not null default '{}',
  category         text,                    -- Corporate, Startup, VC, Ecosystem
  location         text,                    -- Standort bzw. Lage (Venue)
  prio             public.prio,
  wave             smallint check (wave between 1 and 3),
  stage            public.org_stage not null default 'recherche',
  lost_reason      text,                    -- bei „abgesagt“, z. B. „verworfen“
  owner_id         uuid references public.people (id) on delete set null,
  existing_contact text,                    -- „Talent Elevator“, „Coop“, „icons Cooperations“
  warm_via         text,                    -- wer aus dem icons-Netzwerk den Kontakt hat
  contact_person   text,
  contact_info     text,
  url              text,
  next_follow_up   date,
  notes            text,
  -- Venue
  capacity         text,
  overnight        text,
  price            text,
  -- Sponsor
  sponsor_kinds    public.sponsor_kind[] not null default '{}',
  source           text,                    -- Herkunft beim Import, z. B. „Partner.xlsx Z. 12“
  created_by       uuid references public.people (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index organizations_stage_idx on public.organizations (stage);
create index organizations_follow_up_idx on public.organizations (next_follow_up);
create index organizations_roles_idx on public.organizations using gin (roles);
create trigger organizations_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- Aufgaben
-- ---------------------------------------------------------------
create table public.tasks (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  description     text,
  status          public.task_status not null default 'offen',
  assignee_id     uuid references public.people (id) on delete set null,
  due_date        date,
  area_id         text references public.areas (id),
  milestone_id    text references public.milestones (id) on delete set null,
  organization_id uuid references public.organizations (id) on delete set null,
  sort            double precision not null default 0,
  done_at         timestamptz,
  created_by      uuid references public.people (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index tasks_assignee_idx on public.tasks (assignee_id);
create index tasks_due_idx on public.tasks (due_date);
create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- Wissen
-- ---------------------------------------------------------------
create table public.decisions (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,                -- was
  reason      text,                         -- warum
  decided_on  date not null,                -- wann
  decided_by  uuid[] not null default '{}', -- wer (people.id)
  area_id     text references public.areas (id),
  target_type public.target_type,           -- verknüpftes Thema
  target_id   text,
  created_by  uuid references public.people (id) on delete set null,
  created_at  timestamptz not null default now()
);

create table public.links (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  url        text not null,
  area_id    text references public.areas (id),
  sort       smallint not null default 0,
  created_by uuid references public.people (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Zusammenarbeit
-- ---------------------------------------------------------------
create table public.comments (
  id          uuid primary key default gen_random_uuid(),
  target_type public.target_type not null,
  target_id   text not null,
  author_id   uuid not null references public.people (id),
  body        text not null,
  mentions    uuid[] not null default '{}',
  created_at  timestamptz not null default now(),
  edited_at   timestamptz
);
create index comments_target_idx on public.comments (target_type, target_id, created_at);

create table public.activity (
  id          bigint generated always as identity primary key,
  target_type public.target_type not null,
  target_id   text not null,
  actor_id    uuid references public.people (id) on delete set null,
  action      text not null,                -- 'stage_changed', 'created', 'assigned' …
  data        jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index activity_target_idx on public.activity (target_type, target_id, created_at);

create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.people (id) on delete cascade,
  kind         public.notification_kind not null,
  target_type  public.target_type not null,
  target_id    text not null,
  actor_id     uuid references public.people (id) on delete set null,
  comment_id   uuid references public.comments (id) on delete cascade,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index notifications_recipient_idx on public.notifications (recipient_id, read_at, created_at desc);

create table public.user_settings (
  person_id  uuid primary key references public.people (id) on delete cascade,
  sounds     boolean not null default true,
  fun_mode   boolean not null default false,
  theme      text not null default 'system' check (theme in ('system', 'light', 'dark')),
  updated_at timestamptz not null default now()
);
create trigger user_settings_updated_at before update on public.user_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- Row Level Security
-- Keine Rollen: Wer auf der Allowlist steht, darf alles lesen und bearbeiten.
-- Ausnahmen: people nur lesen (Allowlist pflegt Maxi im Dashboard),
-- user_settings und notifications nur die eigenen.
-- ---------------------------------------------------------------
alter table public.people        enable row level security;
alter table public.areas         enable row level security;
alter table public.milestones    enable row level security;
alter table public.organizations enable row level security;
alter table public.tasks         enable row level security;
alter table public.decisions     enable row level security;
alter table public.links         enable row level security;
alter table public.comments      enable row level security;
alter table public.activity      enable row level security;
alter table public.notifications enable row level security;
alter table public.user_settings enable row level security;

create policy "Team liest Team" on public.people
  for select to authenticated using ((select public.is_team_member()));

create policy "Team bearbeitet Bereiche" on public.areas
  for all to authenticated using ((select public.is_team_member())) with check ((select public.is_team_member()));
create policy "Team bearbeitet Meilensteine" on public.milestones
  for all to authenticated using ((select public.is_team_member())) with check ((select public.is_team_member()));
create policy "Team bearbeitet Pipeline" on public.organizations
  for all to authenticated using ((select public.is_team_member())) with check ((select public.is_team_member()));
create policy "Team bearbeitet Aufgaben" on public.tasks
  for all to authenticated using ((select public.is_team_member())) with check ((select public.is_team_member()));
create policy "Team bearbeitet Entscheidungen" on public.decisions
  for all to authenticated using ((select public.is_team_member())) with check ((select public.is_team_member()));
create policy "Team bearbeitet Links" on public.links
  for all to authenticated using ((select public.is_team_member())) with check ((select public.is_team_member()));

create policy "Team liest Kommentare" on public.comments
  for select to authenticated using ((select public.is_team_member()));
create policy "Team schreibt Kommentare als sich selbst" on public.comments
  for insert to authenticated with check ((select public.is_team_member()) and author_id = (select public.current_person_id()));
create policy "Eigene Kommentare bearbeiten" on public.comments
  for update to authenticated using (author_id = (select public.current_person_id())) with check (author_id = (select public.current_person_id()));
create policy "Eigene Kommentare löschen" on public.comments
  for delete to authenticated using (author_id = (select public.current_person_id()));

create policy "Team liest Verlauf" on public.activity
  for select to authenticated using ((select public.is_team_member()));
create policy "Team schreibt Verlauf" on public.activity
  for insert to authenticated with check ((select public.is_team_member()));

create policy "Eigene Benachrichtigungen lesen" on public.notifications
  for select to authenticated using (recipient_id = (select public.current_person_id()));
create policy "Team erzeugt Benachrichtigungen" on public.notifications
  for insert to authenticated with check ((select public.is_team_member()));
create policy "Eigene Benachrichtigungen abhaken" on public.notifications
  for update to authenticated using (recipient_id = (select public.current_person_id())) with check (recipient_id = (select public.current_person_id()));

create policy "Eigene Einstellungen" on public.user_settings
  for all to authenticated
  using (person_id = (select public.current_person_id()))
  with check (person_id = (select public.current_person_id()));

-- Anonyme Zugriffe gibt es nicht.
revoke all on all tables in schema public from anon;

-- ---------------------------------------------------------------
-- Live-Updates (Änderungen der anderen erscheinen sofort)
-- ---------------------------------------------------------------
alter publication supabase_realtime add table
  public.milestones, public.organizations, public.tasks, public.comments,
  public.activity, public.notifications, public.decisions, public.links, public.areas;
