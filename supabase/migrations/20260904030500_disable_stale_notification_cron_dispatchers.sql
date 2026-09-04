-- The deployed dispatchers target a retired notification schema (message/type/push_subscriptions)
-- and repeatedly generate 400/404 errors. In-app realtime alerts are handled directly from
-- public.notifications. Disable the stale cron jobs until a push subscription pipeline exists.
select cron.unschedule('talabak-notification-push-dispatcher');
select cron.unschedule('religious-reminder-dispatcher');
