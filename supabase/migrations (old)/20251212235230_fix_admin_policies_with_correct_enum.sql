/*
  # Fix Admin Policies with Correct Enum Default

  1. Issue
    - Previous policies used 'user' but enum values are: free, premium, admin, professional
    - Need to use 'free' as default

  2. Solution
    - Simpler inline subquery with correct default
    - Should work better from frontend
*/

-- Drop existing admin policies
DROP POLICY IF EXISTS "Admins can insert project type domains" ON guardrails_project_type_domains;
DROP POLICY IF EXISTS "Admins can update project type domains" ON guardrails_project_type_domains;
DROP POLICY IF EXISTS "Admins can delete project type domains" ON guardrails_project_type_domains;

-- Create simpler admin policies with correct enum default
CREATE POLICY "Admins can insert project type domains"
  ON guardrails_project_type_domains
  FOR INSERT
  TO authenticated
  WITH CHECK (
    COALESCE(
      (SELECT role FROM profiles WHERE user_id = auth.uid() LIMIT 1),
      'free'::user_role
    ) = 'admin'::user_role
  );

CREATE POLICY "Admins can update project type domains"
  ON guardrails_project_type_domains
  FOR UPDATE
  TO authenticated
  USING (
    COALESCE(
      (SELECT role FROM profiles WHERE user_id = auth.uid() LIMIT 1),
      'free'::user_role
    ) = 'admin'::user_role
  )
  WITH CHECK (
    COALESCE(
      (SELECT role FROM profiles WHERE user_id = auth.uid() LIMIT 1),
      'free'::user_role
    ) = 'admin'::user_role
  );

CREATE POLICY "Admins can delete project type domains"
  ON guardrails_project_type_domains
  FOR DELETE
  TO authenticated
  USING (
    COALESCE(
      (SELECT role FROM profiles WHERE user_id = auth.uid() LIMIT 1),
      'free'::user_role
    ) = 'admin'::user_role
  );
