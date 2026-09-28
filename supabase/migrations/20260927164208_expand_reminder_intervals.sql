alter table public.reminders
  drop constraint if exists reminders_minutes_before_check,
  add constraint reminders_minutes_before_check
    check (minutes_before in (0, 15, 60, 1440, 2880, 4320, 7200));
