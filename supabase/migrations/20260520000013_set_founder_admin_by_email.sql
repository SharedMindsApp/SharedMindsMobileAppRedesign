-- Ensure the founder account has role='admin'.
--
-- Previous attempts (000008, 000012) may have targeted the wrong email
-- casing or UUID. This migration JOINs auth.users by email (case-insensitive)
-- so it is guaranteed to reach the correct profiles row regardless of UUID.
--
-- Also resets the is_admin() helper to a simple SECURITY DEFINER lookup so
-- admin-gated RLS policies work without recursion.

-- 1. Set admin role via email join (bulletproof)
UPDATE public.profiles p
SET    role = 'admin'
FROM   auth.users u
WHERE  p.id = u.id
  AND  lower(u.email) = lower('matthew@leonardfilming.com')
  AND  p.role IS DISTINCT FROM 'admin';

-- 2. Ensure is_admin() SECURITY DEFINER helper exists and is correct
--    (guards admin_logs SELECT policy and any other admin-gated policies)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
