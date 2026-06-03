-- ─── FIX: Restore safe RLS on all tables ─────────────────────────────────────
-- Run in Supabase Dashboard → SQL Editor → New Query → Run
-- This fixes the chicken-and-egg problem where projects RLS required
-- project_members to exist before any read/write was possible.

-- ─── PROJECTS ─────────────────────────────────────────────────────────────────
-- Owner can always manage their own projects (user_id match — no join needed)
-- Members can read projects they're in via project_members
drop policy if exists "owners manage own projects"       on projects;
drop policy if exists "shared members can view projects" on projects;
drop policy if exists "users manage own projects"        on projects;

create policy "owner full access to own projects" on projects
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "members can read shared projects" on projects
  for select using (
    exists (
      select 1 from project_members pm
      where pm.project_id = projects.id
      and   pm.user_id    = auth.uid()
    )
  );

-- ─── PROJECT_MEMBERS ──────────────────────────────────────────────────────────
drop policy if exists "members can view project_members"  on project_members;
drop policy if exists "owners can insert project_members" on project_members;
drop policy if exists "owners can delete project_members" on project_members;
drop policy if exists "owners can update project_members" on project_members;

-- Any member of a project can see its member list
create policy "members can view project_members" on project_members
  for select using (
    -- Is a member yourself
    exists (
      select 1 from project_members pm2
      where pm2.project_id = project_members.project_id
      and   pm2.user_id    = auth.uid()
    )
    -- OR you own the project directly
    or exists (
      select 1 from projects p
      where p.id      = project_members.project_id
      and   p.user_id = auth.uid()
    )
  );

-- Owners (by user_id on projects table) can insert/update/delete members
create policy "project owners can manage members" on project_members
  for all using (
    exists (
      select 1 from projects p
      where p.id      = project_members.project_id
      and   p.user_id = auth.uid()
    )
    -- Also allow inserting the very first row (owner seeding themselves)
    or not exists (
      select 1 from project_members pm3
      where pm3.project_id = project_members.project_id
    )
  )
  with check (
    exists (
      select 1 from projects p
      where p.id      = project_members.project_id
      and   p.user_id = auth.uid()
    )
    or not exists (
      select 1 from project_members pm3
      where pm3.project_id = project_members.project_id
    )
  );

-- ─── DAILY_LOGS ───────────────────────────────────────────────────────────────
drop policy if exists "members can view daily_logs"  on daily_logs;
drop policy if exists "editors can write daily_logs" on daily_logs;
drop policy if exists "users manage own daily logs"  on daily_logs;

create policy "owner and members can access daily_logs" on daily_logs
  for all using (
    -- Project owner
    exists (
      select 1 from projects p
      where p.id::text  = daily_logs.project_id
      and   p.user_id   = auth.uid()
    )
    -- Shared member (any role can read; editor/owner can write — enforced in app)
    or exists (
      select 1 from projects p
      join project_members pm on pm.project_id = p.id
      where p.id::text = daily_logs.project_id
      and   pm.user_id = auth.uid()
    )
  );

-- ─── LOG_ENTRIES ──────────────────────────────────────────────────────────────
drop policy if exists "members can view log_entries"  on log_entries;
drop policy if exists "editors can write log_entries" on log_entries;
drop policy if exists "users manage own log entries"  on log_entries;

create policy "owner and members can access log_entries" on log_entries
  for all using (
    exists (
      select 1 from daily_logs dl
      join projects p on p.id::text = dl.project_id
      left join project_members pm on pm.project_id = p.id and pm.user_id = auth.uid()
      where dl.id::text = log_entries.daily_log_id
      and (p.user_id = auth.uid() or pm.user_id is not null)
    )
  );

-- ─── ISSUE_ITEMS ──────────────────────────────────────────────────────────────
drop policy if exists "members can view issue_items"  on issue_items;
drop policy if exists "editors can write issue_items" on issue_items;
drop policy if exists "users manage own issue items"  on issue_items;

create policy "owner and members can access issue_items" on issue_items
  for all using (
    exists (
      select 1 from daily_logs dl
      join projects p on p.id::text = dl.project_id
      left join project_members pm on pm.project_id = p.id and pm.user_id = auth.uid()
      where dl.id::text = issue_items.daily_log_id
      and (p.user_id = auth.uid() or pm.user_id is not null)
    )
  );

-- ─── ASSETS ───────────────────────────────────────────────────────────────────
drop policy if exists "members can view assets"  on assets;
drop policy if exists "editors can write assets" on assets;
drop policy if exists "users manage own assets"  on assets;

create policy "owner and members can access assets" on assets
  for all using (
    exists (
      select 1 from projects p
      left join project_members pm on pm.project_id = p.id and pm.user_id = auth.uid()
      where p.id::text = assets.project_id
      and (p.user_id = auth.uid() or pm.user_id is not null)
    )
  );

-- ─── PUNCH_ITEMS ──────────────────────────────────────────────────────────────
drop policy if exists "members can view punch_items"  on punch_items;
drop policy if exists "editors can write punch_items" on punch_items;
drop policy if exists "users manage own punch items"  on punch_items;

create policy "owner and members can access punch_items" on punch_items
  for all using (
    exists (
      select 1 from projects p
      left join project_members pm on pm.project_id = p.id and pm.user_id = auth.uid()
      where p.id::text = punch_items.project_id
      and (p.user_id = auth.uid() or pm.user_id is not null)
    )
  );

-- ─── Re-seed project_members for all existing projects ────────────────────────
insert into project_members (project_id, user_id, role)
select id, user_id, 'owner'
from projects
where user_id is not null
on conflict (project_id, user_id) do nothing;
