-- Add email_confirmed_at to admin_list_users() so the admin UI can
-- show who's unverified + offer a Resend-verification action.
--
-- The original function (20260514000017) only returned
-- last_sign_in_at — fine for an active-users view but useless for
-- support cases where someone signed up but never clicked the link.
--
-- Drop + recreate because PostgreSQL doesn't allow ALTER FUNCTION
-- ... RETURNS TABLE ... — the return type is part of the signature.

DROP FUNCTION IF EXISTS public.admin_list_users();

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id                    uuid,
  display_name          text,
  email                 text,
  role                  text,
  work_types            text[],
  avatar_url            text,
  onboarding_completed  boolean,
  created_at            timestamptz,
  last_sign_in_at       timestamptz,
  email_confirmed_at    timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
  SELECT
    p.id,
    p.display_name,
    u.email::text,
    p.role,
    p.work_types,
    p.avatar_url,
    p.onboarding_completed,
    p.created_at,
    u.last_sign_in_at,
    u.email_confirmed_at
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE public.is_admin()
  ORDER BY p.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
