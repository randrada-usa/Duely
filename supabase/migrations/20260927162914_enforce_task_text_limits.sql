-- Preserve older oversized tasks for viewing and restore, while enforcing the
-- current mobile limits for all newly inserted or updated task rows.
alter table public.tasks
  add constraint tasks_title_length_v2
    check (char_length(btrim(title)) between 1 and 120) not valid,
  add constraint tasks_notes_length_v2
    check (char_length(notes) <= 2000) not valid;
