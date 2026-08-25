create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 80),
  timezone text not null default 'Asia/Manila' check (char_length(timezone) between 1 and 64),
  locale text not null default 'en-PH' check (char_length(locale) between 2 and 35),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id text not null check (char_length(client_id) between 1 and 128),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, client_id)
);

create unique index subjects_user_name_unique_idx
  on public.subjects (user_id, lower(btrim(name)));

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id text not null check (char_length(client_id) between 1 and 128),
  subject_id uuid,
  title text not null check (char_length(btrim(title)) between 1 and 240),
  notes text not null default '' check (char_length(notes) <= 10000),
  due_at timestamptz,
  task_type text not null default 'assignment'
    check (task_type in ('assignment', 'quiz', 'exam', 'project', 'reading', 'other')),
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high')),
  estimated_effort_minutes integer
    check (estimated_effort_minutes in (30, 60, 120, 180, 240)),
  status text not null default 'open'
    check (status in ('open', 'completed')),
  completed_at timestamptz,
  source_image_path text check (
    source_image_path is null or char_length(source_image_path) between 1 and 2048
  ),
  extraction_provenance jsonb check (
    extraction_provenance is null or jsonb_typeof(extraction_provenance) = 'object'
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, client_id),
  foreign key (subject_id, user_id)
    references public.subjects (id, user_id) on delete set null (subject_id),
  check (
    (status = 'completed' and completed_at is not null)
    or (status = 'open' and completed_at is null)
  )
);

create index tasks_user_status_due_at_idx
  on public.tasks (user_id, status, due_at);
create index tasks_subject_owner_idx
  on public.tasks (subject_id, user_id)
  where subject_id is not null;

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid not null,
  minutes_before integer not null check (minutes_before in (0, 15, 60, 1440)),
  scheduled_for timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, task_id),
  foreign key (task_id, user_id)
    references public.tasks (id, user_id) on delete cascade
);

create index reminders_task_owner_idx on public.reminders (task_id, user_id);
create index reminders_user_scheduled_for_idx
  on public.reminders (user_id, scheduled_for);

create table public.consent_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  consent_type text not null check (consent_type in ('model_improvement')),
  consent_version text not null check (char_length(consent_version) between 1 and 40),
  decision text not null check (decision in ('granted', 'withdrawn')),
  decided_at timestamptz not null default now()
);

create index consent_events_user_type_decided_idx
  on public.consent_events (user_id, consent_type, decided_at desc);

create table public.ai_allowances (
  user_id uuid not null references auth.users (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  allowance_limit integer not null default 5 check (allowance_limit >= 0),
  used_count integer not null default 0 check (used_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, period_start),
  check (period_end > period_start),
  check (used_count <= allowance_limit)
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger subjects_set_updated_at
before update on public.subjects
for each row execute function private.set_updated_at();

create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function private.set_updated_at();

create trigger reminders_set_updated_at
before update on public.reminders
for each row execute function private.set_updated_at();

create trigger ai_allowances_set_updated_at
before update on public.ai_allowances
for each row execute function private.set_updated_at();

revoke all on table public.profiles from public, anon, authenticated;
revoke all on table public.subjects from public, anon, authenticated;
revoke all on table public.tasks from public, anon, authenticated;
revoke all on table public.reminders from public, anon, authenticated;
revoke all on table public.consent_events from public, anon, authenticated;
revoke all on table public.ai_allowances from public, anon, authenticated;

grant select on table public.profiles to authenticated;
grant insert (user_id, display_name, timezone, locale)
  on table public.profiles to authenticated;
grant update (display_name, timezone, locale)
  on table public.profiles to authenticated;

grant select, delete on table public.subjects to authenticated;
grant insert (user_id, client_id, name)
  on table public.subjects to authenticated;
grant update (name)
  on table public.subjects to authenticated;

grant select, delete on table public.tasks to authenticated;
grant insert (
  user_id,
  client_id,
  subject_id,
  title,
  notes,
  due_at,
  task_type,
  priority,
  estimated_effort_minutes,
  status,
  completed_at,
  source_image_path,
  extraction_provenance
) on table public.tasks to authenticated;
grant update (
  subject_id,
  title,
  notes,
  due_at,
  task_type,
  priority,
  estimated_effort_minutes,
  status,
  completed_at,
  source_image_path,
  extraction_provenance
) on table public.tasks to authenticated;

grant select, delete on table public.reminders to authenticated;
grant insert (user_id, task_id, minutes_before, scheduled_for)
  on table public.reminders to authenticated;
grant update (minutes_before, scheduled_for)
  on table public.reminders to authenticated;

grant select on table public.consent_events to authenticated;
grant insert (user_id, consent_type, consent_version, decision)
  on table public.consent_events to authenticated;
grant select on table public.ai_allowances to authenticated;

grant all on table public.profiles to service_role;
grant all on table public.subjects to service_role;
grant all on table public.tasks to service_role;
grant all on table public.reminders to service_role;
grant all on table public.consent_events to service_role;
grant all on table public.ai_allowances to service_role;

alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.subjects enable row level security;
alter table public.subjects force row level security;
alter table public.tasks enable row level security;
alter table public.tasks force row level security;
alter table public.reminders enable row level security;
alter table public.reminders force row level security;
alter table public.consent_events enable row level security;
alter table public.consent_events force row level security;
alter table public.ai_allowances enable row level security;
alter table public.ai_allowances force row level security;

create policy profiles_select_own on public.profiles
for select to authenticated
using ((select auth.uid()) = user_id);
create policy profiles_insert_own on public.profiles
for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy profiles_update_own on public.profiles
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy profiles_delete_own on public.profiles
for delete to authenticated
using ((select auth.uid()) = user_id);

create policy subjects_select_own on public.subjects
for select to authenticated
using ((select auth.uid()) = user_id);
create policy subjects_insert_own on public.subjects
for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy subjects_update_own on public.subjects
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy subjects_delete_own on public.subjects
for delete to authenticated
using ((select auth.uid()) = user_id);

create policy tasks_select_own on public.tasks
for select to authenticated
using ((select auth.uid()) = user_id);
create policy tasks_insert_own on public.tasks
for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy tasks_update_own on public.tasks
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy tasks_delete_own on public.tasks
for delete to authenticated
using ((select auth.uid()) = user_id);

create policy reminders_select_own on public.reminders
for select to authenticated
using ((select auth.uid()) = user_id);
create policy reminders_insert_own on public.reminders
for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy reminders_update_own on public.reminders
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy reminders_delete_own on public.reminders
for delete to authenticated
using ((select auth.uid()) = user_id);

create policy consent_events_select_own on public.consent_events
for select to authenticated
using ((select auth.uid()) = user_id);
create policy consent_events_insert_own on public.consent_events
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy ai_allowances_select_own on public.ai_allowances
for select to authenticated
using ((select auth.uid()) = user_id);
