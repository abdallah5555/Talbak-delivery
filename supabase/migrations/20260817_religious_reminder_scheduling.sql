create table if not exists public.religious_reminder_schedules (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  interval_minutes integer not null default 30 check (interval_minutes between 5 and 1440),
  next_due_at timestamptz not null default (now() + interval '30 minutes'),
  last_sent_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.religious_reminder_schedules enable row level security;
drop policy if exists "users manage own religious schedule" on public.religious_reminder_schedules;
create policy "users manage own religious schedule"
  on public.religious_reminder_schedules for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists religious_reminder_due_idx
  on public.religious_reminder_schedules (enabled, next_due_at);

create or replace function public.sync_religious_schedule_from_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or tg_op = 'UPDATE' then
    insert into public.religious_reminder_schedules
      (user_id, enabled, interval_minutes, next_due_at, updated_at)
    values
      (new.user_id, true, 30, now() + interval '30 minutes', now())
    on conflict (user_id) do update set enabled = true, updated_at = now();
    return new;
  elsif tg_op = 'DELETE' then
    if not exists (select 1 from public.push_subscriptions ps where ps.user_id = old.user_id) then
      update public.religious_reminder_schedules
      set enabled = false, updated_at = now()
      where user_id = old.user_id;
    end if;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_religious_schedule_push on public.push_subscriptions;
create trigger trg_sync_religious_schedule_push
after insert or update or delete on public.push_subscriptions
for each row execute function public.sync_religious_schedule_from_push();

insert into public.religious_reminder_schedules
  (user_id, enabled, interval_minutes, next_due_at, updated_at)
select distinct ps.user_id, true, 30, now() + interval '30 minutes', now()
from public.push_subscriptions ps
on conflict (user_id) do nothing;

select cron.unschedule(jobid) from cron.job where jobname = 'religious-reminder-dispatcher';
select cron.schedule(
  'religious-reminder-dispatcher',
  '* * * * *',
  $$select net.http_post(
    url := 'https://vriwhtuxagnbfxybjviz.supabase.co/functions/v1/religious-reminder-dispatcher',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );$$
);
