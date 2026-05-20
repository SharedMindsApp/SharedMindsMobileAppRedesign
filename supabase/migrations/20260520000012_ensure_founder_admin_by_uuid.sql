-- Ensure founder profile has role='admin'.
--
-- Migration 000008 targeted by email which may have matched 0 rows if
-- auth.users email casing / whitespace differed. This migration targets
-- the known UUID directly (visible in every API request in the console)
-- so it is guaranteed to reach the correct row.

UPDATE public.profiles
SET    role = 'admin'
WHERE  id = '90e4c34a-1a9b-4c7c-83a6-2d45bb6b6c39'
  AND  role != 'admin';   -- no-op if already correct
