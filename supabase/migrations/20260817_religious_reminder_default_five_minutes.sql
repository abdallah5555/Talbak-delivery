alter table public.religious_reminder_schedules
  alter column interval_minutes set default 5;

alter table public.religious_reminder_schedules
  alter column next_due_at set default (now() + interval '5 minutes');

alter table public.religious_reminder_schedules
  drop constraint if exists religious_reminder_schedules_interval_minutes_check;

alter table public.religious_reminder_schedules
  add constraint religious_reminder_schedules_interval_minutes_check
  check (interval_minutes in (5, 15, 30, 60));

update public.religious_reminder_schedules
set interval_minutes = 5,
    next_due_at = now() + interval '5 minutes',
    updated_at = now()
where enabled = true
  and interval_minutes = 30;
