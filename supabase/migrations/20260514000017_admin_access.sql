-- Admin access to all profiles + an admin-only RPC for the User Management page.
--
-- Two problems this fixes:
--   1. RLS on profiles only lets each user see their own profile + people they
--      have a connection / shared session / DM with. Admins couldn't see all
--      users in the User Management table.
--   2. Email lives in auth.users (Supabase manages this schema), not in
--      profiles, so any client-side query of profiles can only show display
--      names — not email addresses. Admins need both.
--
-- We solve both with:
--   * A `public.is_admin()` SECURITY DEFINER helper. Returns true if the
--     current auth user has role='admin' in profiles. SECURITY DEFINER bypasses
--     RLS for the internal lookup so the function itself doesn't recurse into
--     the profile RLS check that calls it.
--   * A `profiles_select_admin` RLS policy that grants admins SELECT on every
--     profile row.
--   * An `admin_list_users()` SECURITY DEFINER RPC that JOINs profiles ⨝
--     auth.users and returns the combined rows, guarded so non-admins get an
--     empty result set.

-- ────────────────────────────────────────────────────────────────────
-- 1. is_admin() helper
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

-- ────────────────────────────────────────────────────────────────────
-- 2. profiles SELECT policy: admins see everything
-- ────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;

CREATE POLICY "profiles_select_admin"
ON public.profiles FOR SELECT
TO authenticated
USING (public.is_admin());

-- ────────────────────────────────────────────────────────────────────
-- 3. admin_list_users() RPC — profiles + auth.users join, admin-only
-- ────────────────────────────────────────────────────────────────────

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
  last_sign_in_at       timestamptz
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
    u.last_sign_in_at
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE public.is_admin()
  ORDER BY p.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
