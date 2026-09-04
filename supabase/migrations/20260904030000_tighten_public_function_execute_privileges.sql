-- Least-privilege EXECUTE grants for helper functions exposed through public schema.
-- Role checks are enforced inside these helpers; anonymous callers do not need them.
revoke execute on function public.is_admin() from anon;
revoke execute on function public.is_driver() from anon;
-- Trigger-only helpers must never be directly callable through the Data API.
revoke execute on function public.ignore_duplicate_user_role() from public, anon, authenticated;
revoke execute on function public.touch_complaint_updated_at() from public, anon, authenticated;
