/*
  # Fix Master Projects Foreign Key to Auth Users

  1. Problem
    - master_projects.user_id currently references profiles.id
    - The application code uses auth.uid() which returns auth.users.id
    - This causes foreign key violations when creating projects

  2. Solution
    - Drop the incorrect foreign key constraint
    - Add the correct foreign key constraint pointing to auth.users(id)
    - This aligns with the application code and ensures proper data integrity

  3. Security
    - All existing RLS policies remain intact
    - No data loss or migration of existing records needed
*/

-- Drop the incorrect foreign key constraint
ALTER TABLE master_projects 
DROP CONSTRAINT IF EXISTS master_projects_user_id_fkey;

-- Add the correct foreign key constraint to auth.users
ALTER TABLE master_projects 
ADD CONSTRAINT master_projects_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;
