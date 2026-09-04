-- Internal trigger/secret helpers must not be directly callable through the Data API.
revoke execute on function public.get_vapid_private_key() from public, anon, authenticated;
revoke execute on function public.get_notification_dispatcher_secret() from public, anon, authenticated;
revoke execute on function public.rotate_vapid_private_key(text) from public, anon, authenticated;
revoke execute on function public.claim_due_religious_reminders(integer) from public, anon, authenticated;
revoke execute on function public.award_loyalty_points_on_delivery() from public, anon, authenticated;
revoke execute on function public.notify_order_change() from public, anon, authenticated;
revoke execute on function public.prepare_order_item() from public, anon, authenticated;
revoke execute on function public.recalc_order_totals() from public, anon, authenticated;
revoke execute on function public.protect_admin_accounts() from public, anon, authenticated;
revoke execute on function public.protect_driver_status_integrity() from public, anon, authenticated;
revoke execute on function public.sync_religious_schedule_from_push() from public, anon, authenticated;
revoke execute on function public.sync_user_role_to_roles() from public, anon, authenticated;
revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.bind_complaint_identity() from public, anon, authenticated;
