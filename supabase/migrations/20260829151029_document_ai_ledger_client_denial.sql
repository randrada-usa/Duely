create policy ai_scan_requests_deny_clients
on public.ai_scan_requests
for all
to anon, authenticated
using (false)
with check (false);
