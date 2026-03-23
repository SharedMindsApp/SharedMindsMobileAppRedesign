/*
  # Fix Domains Foreign Key to Reference Auth Users

  1. Problem
    - domains.user_id references profiles.id (a different UUID)
    - The application code inserts auth.users.id into domains.user_id
    - This causes a foreign key violation

  2. Solution
    - Drop the incorrect foreign key constraint
    - Add the correct foreign key constraint pointing to auth.users(id)
    - This matches the original migration intent and the application code

  3. Security
    - All existing RLS policies remain intact
    - Data integrity is maintained through proper foreign key relationship
*/

-- Drop the incorrect foreign key constraint
ALTER TABLE domains 
DROP CONSTRAINT IF EXISTS domains_user_id_fkey;

-- Add the correct foreign key constraint to auth.users
ALTER TABLE domains 
ADD CONSTRAINT domains_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;