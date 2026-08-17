CREATE OR REPLACE FUNCTION public.claim_due_religious_reminders(p_limit integer DEFAULT 100)
RETURNS TABLE(user_id uuid, interval_minutes integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  RETURN QUERY
  WITH due AS (
    SELECT r.user_id, r.interval_minutes
    FROM public.religious_reminder_schedules r
    WHERE r.enabled = true AND r.next_due_at <= now()
    ORDER BY r.next_due_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500)
  ), claimed AS (
    UPDATE public.religious_reminder_schedules r
    SET next_due_at = now() + make_interval(mins => CASE WHEN due.interval_minutes IN (5,15,30,60) THEN due.interval_minutes ELSE 5 END), updated_at = now()
    FROM due
    WHERE r.user_id = due.user_id
    RETURNING r.user_id, CASE WHEN due.interval_minutes IN (5,15,30,60) THEN due.interval_minutes ELSE 5 END AS interval_minutes
  )
  SELECT claimed.user_id, claimed.interval_minutes FROM claimed;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_due_religious_reminders(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_due_religious_reminders(integer) TO service_role;

SELECT cron.unschedule('religious-reminder-dispatcher') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='religious-reminder-dispatcher');
SELECT cron.schedule('religious-reminder-dispatcher','* * * * *', $cron$
  SELECT net.http_post(
    url := 'https://vriwhtuxagnbfxybjviz.supabase.co/functions/v1/religious-reminder-dispatcher',
    headers := jsonb_build_object('Content-Type','application/json','X-Dispatcher-Token',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='talabak_notification_dispatcher_secret')),
    body := jsonb_build_object('source','cron','at',now())
  );
$cron$);
