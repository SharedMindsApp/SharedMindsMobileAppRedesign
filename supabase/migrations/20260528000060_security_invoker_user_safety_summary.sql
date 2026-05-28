-- ─────────────────────────────────────────────────────────────────
-- Fix Supabase linter ERROR: security_definer_view
--   View `public.user_safety_summary` (from 20260525000003_safety_escalation)
--   runs with the VIEW OWNER's privileges and bypasses the querying user's
--   RLS. The linter flags this as a data-exposure risk: any role that can
--   SELECT the view would see flag/warning data for ALL users, regardless of
--   the RLS on profiles / content_flags / user_warnings.
--
-- The view is only ever read through the admin-gated SECURITY DEFINER
-- function `admin_user_safety_summary()` (which checks role = 'admin'); the
-- app never queries the view directly. Flipping the view to security_invoker
-- closes the hole — a direct SELECT now respects the caller's RLS — while the
-- admin RPC keeps working, because inside that SECURITY DEFINER function the
-- view is evaluated as the function's (privileged) owner.
--
-- Requires Postgres 15+ (Supabase is). See:
-- https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view
-- ─────────────────────────────────────────────────────────────────

ALTER VIEW public.user_safety_summary SET (security_invoker = on);
