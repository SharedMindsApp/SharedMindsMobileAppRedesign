-- Set the founder account to role='admin'.
--
-- The role column defaults to 'free' for all new signups; no previous
-- migration promoted the founder account. This one-time data fix targets
-- the account by email so it's safe to run in any environment where that
-- address exists (it's a no-op on envs where it doesn't).

UPDATE public.profiles
SET role = 'admin'
WHERE id = (
  SELECT id
  FROM auth.users
  WHERE email = 'matthew@leonardfilming.com'
  LIMIT 1
);
