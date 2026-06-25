-- supabase/schema.sql
-- Automate or Not? — workshop game schema.
--
-- WORKSHOP-GRADE SECURITY: the RLS policies below grant the anon role full
-- read/write on game tables. This is intentional for a throwaway, time-boxed
-- training room with no real customer data. DO NOT reuse these policies for
-- any table holding personal or production data.

create extension if not exists pgcrypto;

-- ── tables ────────────────────────────────────────────────────────────────

create table if not exists rooms (
  id          uuid primary key default gen_random_uuid(),
  code        text unique,
  current_idx int default 0,
  reveal      boolean default false,
  status      text default 'lobby',
  created_at  timestamptz default now()
);

create table if not exists players (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid references rooms on delete cascade,
  name        text,
  team        text,
  score       int default 0,
  client_id   text,
  created_at  timestamptz default now(),
  unique (room_id, client_id)
);

create table if not exists decisions (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid references rooms on delete cascade,
  player_id    uuid references players on delete cascade,
  scenario_id  text,
  scenario_idx int,
  choice       text,
  is_best      boolean,
  breach       boolean,
  created_at   timestamptz default now(),
  unique (player_id, scenario_idx)
);

-- ── row level security (WORKSHOP-GRADE: permissive anon access) ────────────

alter table rooms     enable row level security;
alter table players   enable row level security;
alter table decisions enable row level security;

drop policy if exists rooms_anon_all     on rooms;
drop policy if exists players_anon_all    on players;
drop policy if exists decisions_anon_all  on decisions;

-- One permissive policy per table covering select/insert/update for anon.
create policy rooms_anon_all on rooms
  for all to anon using (true) with check (true);

create policy players_anon_all on players
  for all to anon using (true) with check (true);

create policy decisions_anon_all on decisions
  for all to anon using (true) with check (true);

-- ── realtime publication ───────────────────────────────────────────────────
-- Add all three tables to the supabase_realtime publication so the client
-- receives postgres_changes events. The do-block guards re-runs.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table rooms;
    alter publication supabase_realtime add table players;
    alter publication supabase_realtime add table decisions;
  else
    create publication supabase_realtime for table rooms, players, decisions;
  end if;
exception
  when duplicate_object then null; -- table already in the publication
end $$;

-- ── seed: one demo room ────────────────────────────────────────────────────

insert into rooms (code, current_idx, reveal, status)
values ('DEMO', 0, false, 'lobby')
on conflict (code) do nothing;
