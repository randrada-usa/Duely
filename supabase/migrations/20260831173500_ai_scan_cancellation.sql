alter table public.ai_scan_requests drop constraint ai_scan_requests_state_check;
alter table public.ai_scan_requests drop constraint ai_scan_requests_check1;

alter table public.ai_scan_requests
  add constraint ai_scan_requests_state_check
  check (state in ('reserved', 'completed', 'failed', 'cancelled'));

alter table public.ai_scan_requests
  add constraint ai_scan_requests_lifecycle_check
  check (
    (state = 'reserved' and completed_at is null and failed_at is null)
    or (state = 'completed' and completed_at is not null and failed_at is null)
    or (state in ('failed', 'cancelled') and completed_at is null and failed_at is not null)
  );

create function public.cancel_ai_scan(p_user_id uuid, p_request_id uuid)
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
  set state = 'cancelled', completed_at = null, failed_at = now()
  where request.id = p_request_id
    and request.user_id = p_user_id
    and request.state in ('reserved', 'completed')
  returning request.period_start into request_period_start;

  if request_period_start is null then return false; end if;

  update public.ai_allowances allowance
  set used_count = greatest(allowance.used_count - 1, 0)
  where allowance.user_id = p_user_id
    and allowance.period_start = request_period_start;

  return true;
end;
$$;

revoke all on function public.cancel_ai_scan(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.cancel_ai_scan(uuid, uuid) to service_role;
