-- V1 Migration 009: Add full_name alias + missing profile columns
--
-- Problem: Legacy code references profiles.full_name everywhere but V1 schema
-- uses display_name. Also, several columns referenced in code don't exist yet.
--
-- Fix: Add full_name as a real column that stays in sync with display_name,
-- plus add missing columns that the app expects.

-- ============================================================
-- 1. Add full_name column as alias for display_name
--    We use a real column + trigger to keep them in sync,
--    since PostgREST can't do column aliases.
-- ============================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;

-- Backfill: copy display_name into full_name for existing rows
UPDATE public.profiles SET full_name = display_name WHERE full_name IS NULL;

-- Trigger: keep full_name and display_name in sync
CREATE OR REPLACE FUNCTION public.sync_profile_names()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- If full_name was explicitly set, sync to display_name
  IF TG_OP = 'INSERT' THEN
    IF NEW.full_name IS NOT NULL AND NEW.display_name IS NULL THEN
      NEW.display_name := NEW.full_name;
    ELSIF NEW.display_name IS NOT NULL AND NEW.full_name IS NULL THEN
      NEW.full_name := NEW.display_name;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.full_name IS DISTINCT FROM OLD.full_name THEN
      NEW.display_name := NEW.full_name;
    ELSIF NEW.display_name IS DISTINCT FROM OLD.display_name THEN
      NEW.full_name := NEW.display_name;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_profile_names_trigger ON public.profiles;
CREATE TRIGGER sync_profile_names_trigger
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_names();


-- ============================================================
-- 2. Add missing columns that the app references
-- ============================================================

-- email column (some queries expect it on profiles)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- role column for admin/premium/free distinction
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'free';

-- safe_mode_enabled for regulation system
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS safe_mode_enabled boolean NOT NULL DEFAULT false;

-- testing_mode_enabled for dev/QA
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS testing_mode_enabled boolean NOT NULL DEFAULT false;

-- daily_alignment_enabled for regulation
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_alignment_enabled boolean NOT NULL DEFAULT false;

-- active_preset_id for regulation presets
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_preset_id uuid;

-- household_id for household features
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS household_id uuid;


-- ============================================================
-- 3. Backfill email from auth.users for existing profiles
-- ============================================================
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND p.email IS NULL
  AND u.email IS NOT NULL;


-- ============================================================
-- 4. Update handle_new_user to also set full_name and email
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_space_id uuid;
  chosen_name text;
BEGIN
  chosen_name := coalesce(
    new.raw_user_meta_data ->> 'display_name',
    new.raw_user_meta_data ->> 'full_name',
    split_part(new.email, '@', 1),
    'Explorer'
  );

  -- Create the profile
  INSERT INTO public.profiles (id, display_name, full_name, email)
  VALUES (new.id, chosen_name, chosen_name, new.email)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);

  -- Create personal space
  INSERT INTO public.spaces (type, name, created_by)
  VALUES ('personal', 'Personal Space', new.id)
  RETURNING id INTO new_space_id;

  -- Create space membership
  INSERT INTO public.space_members (space_id, user_id, role, status)
  VALUES (new_space_id, new.id, 'owner', 'active');

  RETURN new;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'handle_new_user failed for %: %', new.id, sqlerrm;
    RETURN new;
END;
$$;
