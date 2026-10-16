-- Betrag je Firma + Sponsoring-Ziel (16.10.): ganze Euro, leer = noch offen.
-- Betrag steht im Firmen-Detail ab „Im Gespräch“, das Ziel setzt das Team (Bereich Sponsoren).
alter table public.organizations add column if not exists amount integer check (amount >= 0);
alter table public.areas add column if not exists goal_amount integer check (goal_amount >= 0);
