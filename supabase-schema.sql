-- FieldLog — Supabase Schema (Auth Edition)
-- Run this in Supabase Dashboard → SQL Editor → New Query → Run
-- This script is safe to re-run (uses IF NOT EXISTS / OR REPLACE).
-- Enables Supabase Auth + Row Level Security so each user only sees their own data.

-- ─── Enable UUID extension ─────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── User Profiles ─────────────────────────────────────────────────────────────
create table if not exists user_profiles (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  engineer_name  text,
  company_name   text,
  logo_data_url  text,
  created        timestamptz default now(),
  unique(user_id)
);
alter table user_profiles enable row level security;
drop policy if exists "users manage own profile" on user_profiles;
create policy "users manage own profile" on user_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Projects ──────────────────────────────────────────────────────────────────
create table if not exists projects (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade,
  project_name   text not null,
  client_name    text,
  location       text,
  project_number text,
  activity_type  text check (activity_type in ('FAT','SAT','T&C','Commissioning')),
  start_date     text,
  created        timestamptz default now()
);
alter table projects enable row level security;
drop policy if exists "users manage own projects" on projects;
create policy "users manage own projects" on projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Daily Logs ────────────────────────────────────────────────────────────────
-- Scoped to projects the user owns via project_id FK check
create table if not exists daily_logs (
  id                uuid primary key default gen_random_uuid(),
  project_id        text not null,
  log_date          text not null,
  executive_summary text,
  lookahead         text,
  created           timestamptz default now()
);
alter table daily_logs enable row level security;
drop policy if exists "users manage own daily logs" on daily_logs;
create policy "users manage own daily logs" on daily_logs
  for all using (
    exists (
      select 1 from projects
      where projects.id::text = daily_logs.project_id
      and projects.user_id = auth.uid()
    )
  );

-- ─── Log Entries ───────────────────────────────────────────────────────────────
create table if not exists log_entries (
  id           uuid primary key default gen_random_uuid(),
  daily_log_id text not null,
  time_stamp   text not null,
  content      text not null,
  sort_order   integer default 0,
  created      timestamptz default now()
);
alter table log_entries enable row level security;
drop policy if exists "users manage own log entries" on log_entries;
create policy "users manage own log entries" on log_entries
  for all using (
    exists (
      select 1 from daily_logs
      join projects on projects.id::text = daily_logs.project_id
      where daily_logs.id::text = log_entries.daily_log_id
      and projects.user_id = auth.uid()
    )
  );

-- ─── Issue Items ───────────────────────────────────────────────────────────────
create table if not exists issue_items (
  id           uuid primary key default gen_random_uuid(),
  daily_log_id text not null,
  issue_number integer default 0,
  description  text not null,
  status       text default 'Open' check (status in ('Open','In Progress','Closed')),
  owner        text,
  target_date  text,
  created      timestamptz default now()
);
alter table issue_items enable row level security;
drop policy if exists "users manage own issue items" on issue_items;
create policy "users manage own issue items" on issue_items
  for all using (
    exists (
      select 1 from daily_logs
      join projects on projects.id::text = daily_logs.project_id
      where daily_logs.id::text = issue_items.daily_log_id
      and projects.user_id = auth.uid()
    )
  );

-- ─── Assets ────────────────────────────────────────────────────────────────────
create table if not exists assets (
  id         uuid primary key default gen_random_uuid(),
  project_id text not null,
  asset_id   text not null,
  asset_name text not null,
  asset_type text check (asset_type in ('Tank','Valve','Drive','Panel','Instrument','Other')),
  status     text default 'In Progress' check (status in ('Complete','Open Issue','Failed','Deferred','Locked by Client','In Progress')),
  notes      text,
  created    timestamptz default now()
);
alter table assets enable row level security;
drop policy if exists "users manage own assets" on assets;
create policy "users manage own assets" on assets
  for all using (
    exists (
      select 1 from projects
      where projects.id::text = assets.project_id
      and projects.user_id = auth.uid()
    )
  );

-- ─── Punch Items ───────────────────────────────────────────────────────────────
create table if not exists punch_items (
  id          uuid primary key default gen_random_uuid(),
  project_id  text not null,
  item_number integer default 0,
  description text not null,
  status      text default 'Open' check (status in ('Open','In Progress','Closed')),
  owner       text,
  target_date text,
  date_closed text,
  created     timestamptz default now()
);
alter table punch_items enable row level security;
drop policy if exists "users manage own punch items" on punch_items;
create policy "users manage own punch items" on punch_items
  for all using (
    exists (
      select 1 from projects
      where projects.id::text = punch_items.project_id
      and projects.user_id = auth.uid()
    )
  );

-- ─── Grant access to authenticated users ───────────────────────────────────────
grant all on user_profiles to authenticated;
grant all on projects      to authenticated;
grant all on daily_logs    to authenticated;
grant all on log_entries   to authenticated;
grant all on issue_items   to authenticated;
grant all on assets        to authenticated;
grant all on punch_items   to authenticated;
