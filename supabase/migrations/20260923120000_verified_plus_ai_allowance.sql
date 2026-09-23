-- A downgrade must retain the historical usage count without granting further scans.
alter table public.ai_allowances drop constraint ai_allowances_check1;

create function public.set_verified_ai_allowance_limit(
  p_user_id uuid,
  p_allowance_limit integer
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  local_period_start date := date_trunc(
    'month', timezone('Asia/Manila', statement_timestamp())
  )::date;
begin
  if p_user_id is null or p_allowance_limit not in (5, 20) then
    raise exception 'Invalid verified AI allowance.' using errcode = '22023';
  end if;

  insert into public.ai_allowances (
    user_id, period_start, period_end, allowance_limit, used_count
  ) values (
    p_user_id, local_period_start,
    (local_period_start + interval '1 month')::date,
    p_allowance_limit, 0
  )
  on conflict (user_id, period_start) do update
  set allowance_limit = excluded.allowance_limit;
end;
$$;

revoke all on function public.set_verified_ai_allowance_limit(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.set_verified_ai_allowance_limit(uuid, integer)
  to service_role;
