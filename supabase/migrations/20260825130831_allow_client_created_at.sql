-- Preserve device creation timestamps during explicit guest-to-account backup.
-- Ownership remains enforced by RLS, and created_at is not updateable afterward.
grant insert (created_at) on table public.subjects to authenticated;
grant insert (created_at) on table public.tasks to authenticated;
