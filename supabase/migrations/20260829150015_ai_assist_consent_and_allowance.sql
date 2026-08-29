alter table public.consent_events
  drop constraint consent_events_consent_type_check;

alter table public.consent_events
  add constraint consent_events_consent_type_check
  check (consent_type in ('ai_processing', 'model_improvement'));

create table public.ai_scan_requests (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  state text not null check (state in ('reserved', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,
  check (period_end > period_start),
  check (
    (state = 'reserved' and completed_at is null and failed_at is null)
    or (state = 'completed' and completed_at is not null and failed_at is null)
    or (state = 'failed' and completed_at is null and failed_at is not null)
  )
);

create index ai_scan_requests_user_created_at_idx
  on public.ai_scan_requests (user_id, created_at desc);

revoke all on table public.ai_scan_requests from public, anon, authenticated;
grant all on table public.ai_scan_requests to service_role;

alter table public.ai_scan_requests enable row level security;
alter table public.ai_scan_requests force row level security;

create function public.reserve_ai_scan(p_user_id uuid, p_request_id uuid)
returns table (
  reservation_status text,
  current_used_count integer,
  current_allowance_limit integer,
  current_period_start date,
  current_period_end date
)
language plpgsql
set search_path = ''
as $$
declare
  latest_consent_decision text;
  existing_state text;
  local_period_start date := date_trunc(
    'month',
    timezone('Asia/Manila', statement_timestamp())
  )::date;
  local_period_end date;
  did_insert integer;
begin
  if p_user_id is null then
    raise exception 'A user identifier is required.' using errcode = '22004';
  end if;

  select ce.decision
  into latest_consent_decision
  from public.consent_events ce
  where ce.user_id = p_user_id
    and ce.consent_type = 'ai_processing'
  order by ce.decided_at desc, ce.id desc
  limit 1;

  if latest_consent_decision is distinct from 'granted' then
    return query select
      'consent_required'::text,
      0,
      5,
      local_period_start,
      (local_period_start + interval '1 month')::date;
    return;
  end if;

  local_period_end := (local_period_start + interval '1 month')::date;

  insert into public.ai_scan_requests (
    id,
    user_id,
    period_start,
    period_end,
    state
  ) values (
    p_request_id,
    p_user_id,
    local_period_start,
    local_period_end,
    'reserved'
  )
  on conflict (id) do nothing;

  get diagnostics did_insert = row_count;

  if did_insert = 0 then
    select request.state
    into existing_state
    from public.ai_scan_requests request
    where request.id = p_request_id
      and request.user_id = p_user_id;

    if existing_state is null then
      raise exception 'The request identifier is already in use.' using errcode = '23505';
    end if;

    return query
    select
      existing_state,
      allowance.used_count,
      allowance.allowance_limit,
      allowance.period_start,
      allowance.period_end
    from public.ai_allowances allowance
    where allowance.user_id = p_user_id
      and allowance.period_start = local_period_start;
    return;
  end if;

  insert into public.ai_allowances (
    user_id,
    period_start,
    period_end,
    allowance_limit,
    used_count
  ) values (
    p_user_id,
    local_period_start,
    local_period_end,
    5,
    0
  )
  on conflict (user_id, period_start) do nothing;

  return query
  update public.ai_allowances allowance
  set used_count = allowance.used_count + 1
  where allowance.user_id = p_user_id
    and allowance.period_start = local_period_start
    and allowance.used_count < allowance.allowance_limit
  returning
    'reserved'::text,
    allowance.used_count,
    allowance.allowance_limit,
    allowance.period_start,
    allowance.period_end;

  if not found then
    delete from public.ai_scan_requests request
    where request.id = p_request_id
      and request.user_id = p_user_id;

    return query
    select
      'quota_exhausted'::text,
      allowance.used_count,
      allowance.allowance_limit,
      allowance.period_start,
      allowance.period_end
    from public.ai_allowances allowance
    where allowance.user_id = p_user_id
      and allowance.period_start = local_period_start;
  end if;
end;
$$;

create function public.complete_ai_scan(p_user_id uuid, p_request_id uuid)
returns boolean
language plpgsql
set search_path = ''
as $$
begin
  if p_user_id is null then
    raise exception 'A user identifier is required.' using errcode = '22004';
  end if;

  update public.ai_scan_requests request
  set state = 'completed', completed_at = now()
  where request.id = p_request_id
    and request.user_id = p_user_id
    and request.state = 'reserved';

  return found;
end;
$$;

create function public.release_ai_scan(p_user_id uuid, p_request_id uuid)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  request_period_start date;
begin
  if p_user_id is null then
    raise exception 'A user identifier is required.' using errcode = '22004';
  end if;

  update public.ai_scan_requests request
  set state = 'failed', failed_at = now()
  where request.id = p_request_id
    and request.user_id = p_user_id
    and request.state = 'reserved'
  returning request.period_start into request_period_start;

  if request_period_start is null then
    return false;
  end if;

  update public.ai_allowances allowance
  set used_count = greatest(allowance.used_count - 1, 0)
  where allowance.user_id = p_user_id
    and allowance.period_start = request_period_start;

  return true;
end;
$$;

revoke all on function public.reserve_ai_scan(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.complete_ai_scan(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.release_ai_scan(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.reserve_ai_scan(uuid, uuid) to service_role;
grant execute on function public.complete_ai_scan(uuid, uuid) to service_role;
grant execute on function public.release_ai_scan(uuid, uuid) to service_role;
