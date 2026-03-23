/*
  # Fix Domains Foreign Key and Auto-Create Profiles

  1. Problem
    - The domains table references profiles.id instead of auth.users(id)
    - Users can authenticate without having a profile record
    - This causes foreign key violations when creating domains

  2. Solution
    - Create a function to auto-generate profiles for new users
    - Create a trigger to call this function on user signup
    - Backfill profiles for existing users who don't have one
    - Keep the existing foreign key relationship (domains -> profiles)

  3. Security
    - Profiles are automatically created during signup
    - Users cannot manually create profiles for other users
    - All existing RLS policies remain in effect
*/

-- Function to create profile for new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create profiles on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for existing users without profiles
INSERT INTO public.profiles (user_id, full_name)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'full_name', 'User')
FROM auth.users au
LEFT JOIN public.profiles p ON p.user_id = au.id
WHERE p.id IS NULL
ON CONFLICT (user_id) DO NOTHING;