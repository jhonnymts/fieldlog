-- ─── Sprint 6: Project Sharing ────────────────────────────────────────────────
-- Run in Supabase Dashboard → SQL Editor → New Query → Run
-- Safe to re-run (uses IF NOT EXISTS / OR REPLACE).

-- ─── project_members ─────────────────────────────────────────────────────────
create table if not exists project_members (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'viewer'
                check (role in ('owner','editor','viewer')),
  invited_by  uuid references auth.users(id),
  created     timestamptz default now(),
  unique (project_id, user_id)
);
alter table project_members enable row level security;

drop policy if exists "members can view project_members" on project_members;
create policy "members can view project_members" on project_members
  for select using (
    exists (
      select 1 from project_members pm2
      where pm2.project_id = project_members.project_id
      and pm2.user_id = auth.uid()
    )
  );

drop policy if exists "owners can insert project_members" on project_members;
create policy "owners can insert project_members" on project_members
  for insert with check (
    exists (
      select 1 from project_members pm2
      where pm2.project_id = project_members.project_id
      and pm2.user_id = auth.uid()
      and pm2.role = 'owner'
    )
    -- also allow the very first row (owner seeding themselves)
    or not exists (
      select 1 from project_members pm3
      where pm3.project_id = project_members.project_id
    )
  );

drop policy if exists "owners can delete project_members" on project_members;
create policy "owners can delete project_members" on project_members
  for delete using (
    exists (
      select 1 from project_members pm2
      where pm2.project_id = project_members.project_id
      and pm2.user_id = auth.uid()
      and pm2.role = 'owner'
    )
  );

drop policy if exists "owners can update project_members" on project_members;
create policy "owners can update project_members" on project_members
  for update using (
    exists (
      select 1 from project_members pm2
      where pm2.project_id = project_members.project_id
      and pm2.user_id = auth.uid()
      and pm2.role = 'owner'
    )
  );

grant all on project_members to authenticated;

-- ─── invitations ─────────────────────────────────────────────────────────────
create table if not exists invitations (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references projects(id) on delete cascade,
  invited_email  text not null,
  role           text not null default 'viewer'
                   check (role in ('editor','viewer')),
  invited_by     uuid not null references auth.users(id),
  status         text not null default 'pending'
                   check (status in ('pending','accepted','declined')),
  created        timestamptz default now(),
  unique (project_id, invited_email)
);
alter table invitations enable row level security;

drop policy if exists "inviter can manage invitations" on invitations;
create policy "inviter can manage invitations" on invitations
  for all using (invited_by = auth.uid())
  with check (invited_by = auth.uid());

drop policy if exists "invitee can view and update own invitation" on invitations;
create policy "invitee can view and update own invitation" on invitations
  for all using (invited_email = (select email from auth.users where id = auth.uid()));

grant all on invitations to authenticated;

-- ─── Widen RLS on child tables to allow shared members ───────────────────────
-- projects: members can read projects they are members of
drop policy if exists "users manage own projects" on projects;
create policy "owners manage own projects" on projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "shared members can view projects" on projects;
create policy "shared members can view projects" on projects
  for select using (
    exists (
      select 1 from project_members pm
      where pm.project_id = projects.id
      and pm.user_id = auth.uid()
    )
  );

-- daily_logs: members (any role) can read; editors/owners can write
drop policy if exists "users manage own daily logs" on daily_logs;

drop policy if exists "members can view daily_logs" on daily_logs;
create policy "members can view daily_logs" on daily_logs
  for select using (
    exists (
      select 1 from projects
      join project_members pm on pm.project_id = projects.id
      where projects.id::text = daily_logs.project_id
      and pm.user_id = auth.uid()
    )
    or exists (
      select 1 from projects
      where projects.id::text = daily_logs.project_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "editors can write daily_logs" on daily_logs;
create policy "editors can write daily_logs" on daily_logs
  for all using (
    exists (
      select 1 from projects
      where projects.id::text = daily_logs.project_id
      and projects.user_id = auth.uid()
    )
    or exists (
      select 1 from projects
      join project_members pm on pm.project_id = projects.id
      where projects.id::text = daily_logs.project_id
      and pm.user_id = auth.uid()
      and pm.role in ('owner','editor')
    )
  );

-- log_entries: same pattern
drop policy if exists "users manage own log entries" on log_entries;

drop policy if exists "members can view log_entries" on log_entries;
create policy "members can view log_entries" on log_entries
  for select using (
    exists (
      select 1 from daily_logs
      join projects on projects.id::text = daily_logs.project_id
      left join project_members pm on pm.project_id = projects.id and pm.user_id = auth.uid()
      where daily_logs.id::text = log_entries.daily_log_id
      and (projects.user_id = auth.uid() or pm.user_id is not null)
    )
  );

drop policy if exists "editors can write log_entries" on log_entries;
create policy "editors can write log_entries" on log_entries
  for all using (
    exists (
      select 1 from daily_logs
      join projects on projects.id::text = daily_logs.project_id
      left join project_members pm on pm.project_id = projects.id and pm.user_id = auth.uid()
      where daily_logs.id::text = log_entries.daily_log_id
      and (
        projects.user_id = auth.uid()
        or (pm.user_id is not null and pm.role in ('owner','editor'))
      )
    )
  );

-- issue_items
drop policy if exists "users manage own issue items" on issue_items;

drop policy if exists "members can view issue_items" on issue_items;
create policy "members can view issue_items" on issue_items
  for select using (
    exists (
      select 1 from daily_logs
      join projects on projects.id::text = daily_logs.project_id
      left join project_members pm on pm.project_id = projects.id and pm.user_id = auth.uid()
      where daily_logs.id::text = issue_items.daily_log_id
      and (projects.user_id = auth.uid() or pm.user_id is not null)
    )
  );

drop policy if exists "editors can write issue_items" on issue_items;
create policy "editors can write issue_items" on issue_items
  for all using (
    exists (
      select 1 from daily_logs
      join projects on projects.id::text = daily_logs.project_id
      left join project_members pm on pm.project_id = projects.id and pm.user_id = auth.uid()
      where daily_logs.id::text = issue_items.daily_log_id
      and (
        projects.user_id = auth.uid()
        or (pm.user_id is not null and pm.role in ('owner','editor'))
      )
    )
  );

-- assets
drop policy if exists "users manage own assets" on assets;

drop policy if exists "members can view assets" on assets;
create policy "members can view assets" on assets
  for select using (
    exists (
      select 1 from projects
      left join project_members pm on pm.project_id = projects.id and pm.user_id = auth.uid()
      where projects.id::text = assets.project_id
      and (projects.user_id = auth.uid() or pm.user_id is not null)
    )
  );

drop policy if exists "editors can write assets" on assets;
create policy "editors can write assets" on assets
  for all using (
    exists (
      select 1 from projects
      left join project_members pm on pm.project_id = projects.id and pm.user_id = auth.uid()
      where projects.id::text = assets.project_id
      and (
        projects.user_id = auth.uid()
        or (pm.user_id is not null and pm.role in ('owner','editor'))
      )
    )
  );

-- punch_items
drop policy if exists "users manage own punch items" on punch_items;

drop policy if exists "members can view punch_items" on punch_items;
create policy "members can view punch_items" on punch_items
  for select using (
    exists (
      select 1 from projects
      left join project_members pm on pm.project_id = projects.id and pm.user_id = auth.uid()
      where projects.id::text = punch_items.project_id
      and (projects.user_id = auth.uid() or pm.user_id is not null)
    )
  );

drop policy if exists "editors can write punch_items" on punch_items;
create policy "editors can write punch_items" on punch_items
  for all using (
    exists (
      select 1 from projects
      left join project_members pm on pm.project_id = projects.id and pm.user_id = auth.uid()
      where projects.id::text = punch_items.project_id
      and (
        projects.user_id = auth.uid()
        or (pm.user_id is not null and pm.role in ('owner','editor'))
      )
    )
  );

-- ─── Seed existing projects with owner rows ───────────────────────────────────
-- This backfills project_members for all existing projects so owners
-- can still access their own projects after the RLS change.
insert into project_members (project_id, user_id, role)
select id, user_id, 'owner'
from projects
where user_id is not null
on conflict (project_id, user_id) do nothing;

-- ─── Helper RPC: look up a user_id by email ───────────────────────────────────
-- Used by TeamPanel to add an existing user directly to project_members.
-- Must be created in the Supabase SQL editor with SECURITY DEFINER so it can
-- read auth.users (which is not accessible from the client otherwise).
create or replace function get_user_id_by_email(p_email text)
returns uuid
language sql
security definer
stable
as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;

-- Grant execute to authenticated users
grant execute on function get_user_id_by_email(text) to authenticated;
