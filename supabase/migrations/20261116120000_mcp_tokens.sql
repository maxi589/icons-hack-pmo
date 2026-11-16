-- MCP (16.11.): Jede Person verbindet ihren KI-Agenten (Claude, ChatGPT …) mit einem eigenen Schlüssel.
-- In der Datenbank steht nur der SHA-256-Hash plus die letzten 4 Zeichen als Kennung. Anlegen, Auflisten und
-- Widerrufen nur über Server-Aktionen mit dem Secret Key (src/lib/mcp-actions.ts), deshalb kein Zugriff für Clients.
create table if not exists public.mcp_tokens (
  id           uuid primary key default gen_random_uuid(),
  person_id    uuid not null references public.people (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 40),
  hash         text not null unique,
  kennung      text not null,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at   timestamptz
);
create index if not exists mcp_tokens_person_idx on public.mcp_tokens (person_id);

alter table public.mcp_tokens enable row level security;
revoke all on public.mcp_tokens from anon, authenticated;
grant all on public.mcp_tokens to service_role;
