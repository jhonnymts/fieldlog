-- FieldLog — Supabase Schema
-- Paste this entire file into Supabase Dashboard → SQL Editor → New Query → Run
-- This creates all 6 tables and disables Row Level Security so the app can read/write freely.
-- Access is controlled by the app's shared password gate instead.

-- ─── Projects ─────────────────────────────────────────────────────────────────
create table if not exists projects (
  id            uuid primary key default gen_random_uuid(),
  project_name  text not null,
  client_name   text,
  location      text,
  project_number text,
  activity_type text check (activity_type in ('FAT','SAT','T&C','Commissioning')),
  start_date    text,
  created       timestamptz default now()
);
alter table projects disable row level security;
grant all on projects to anon, authenticated;

-- ─── Daily Logs ───────────────────────────────────────────────────────────────
create table if not exists daily_logs (
  id                uuid primary key default gen_random_uuid(),
  project_id        text not null,
  log_date          text not null,
  executive_summary text,
  lookahead         text,
  created           timestamptz default now()
);
alter table daily_logs disable row level security;
grant all on daily_logs to anon, authenticated;

-- ─── Log Entries ──────────────────────────────────────────────────────────────
create table if not exists log_entries (
  id           uuid primary key default gen_random_uuid(),
  daily_log_id text not null,
  time_stamp   text not null,
  content      text not null,
  sort_order   integer default 0,
  created      timestamptz default now()
);
alter table log_entries disable row level security;
grant all on log_entries to anon, authenticated;

-- ─── Issue Items ──────────────────────────────────────────────────────────────
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
alter table issue_items disable row level security;
grant all on issue_items to anon, authenticated;

-- ─── Assets ───────────────────────────────────────────────────────────────────
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
alter table assets disable row level security;
grant all on assets to anon, authenticated;

-- ─── Punch Items ──────────────────────────────────────────────────────────────
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
alter table punch_items disable row level security;
grant all on punch_items to anon, authenticated;
