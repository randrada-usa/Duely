create or replace function public.cancel_ai_scan(p_user_id uuid, p_request_id uuid)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  request_period_start date;
  local_period_start date := date_trunc(
    'month',
    timezone('Asia/Manila', statement_timestamp())
  )::date;
  local_period_end date := (local_period_start + interval '1 month')::date;
  did_insert integer;
begin
  if p_user_id is null then
    raise exception 'A user identifier is required.' using errcode = '22004';
  end if;

  insert into public.ai_scan_requests (
    id,
    user_id,
    period_start,
    period_end,
    state,
    failed_at
  ) values (
    p_request_id,
    p_user_id,
    local_period_start,
    local_period_end,
    'cancelled',
    now()
  )
  on conflict (id) do nothing;

  get diagnostics did_insert = row_count;
  if did_insert = 1 then return true; end if;

  update public.ai_scan_requests request
  set state = 'cancelled', completed_at = null, failed_at = now()
  where request.id = p_request_id
    and request.user_id = p_user_id
    and request.state in ('reserved', 'completed')
  returning request.period_start into request_period_start;

  if request_period_start is null then
    return exists (
      select 1
      from public.ai_scan_requests request
      where request.id = p_request_id
        and request.user_id = p_user_id
        and request.state = 'cancelled'
    );
  end if;

  update public.ai_allowances allowance
  set used_count = greatest(allowance.used_count - 1, 0)
  where allowance.user_id = p_user_id
    and allowance.period_start = request_period_start;

  return true;
end;
$$;
