/*
  # Fix AI Provider RLS Policies

  ## Issue
  The existing RLS policies for ai_providers, ai_provider_models, and ai_feature_routes
  are using incorrect field references (profiles.id instead of profiles.user_id).

  ## Changes
  1. Drop all existing admin policies for the three tables
  2. Recreate them with the correct profiles.user_id reference and proper enum casting
  3. Use the same pattern as other admin policies in the system (COALESCE with explicit enum casting)

  ## Security
  - Maintains the same security model: only admins can modify, authenticated users can read enabled items
  - Fixes the bug preventing admins from actually modifying the data
*/

-- Drop and recreate ai_providers admin policies
DROP POLICY IF EXISTS "Admins can view all providers" ON ai_providers;
DROP POLICY IF EXISTS "Admins can insert providers" ON ai_providers;
DROP POLICY IF EXISTS "Admins can update providers" ON ai_providers;
DROP POLICY IF EXISTS "Admins can delete providers" ON ai_providers;

CREATE POLICY "Admins can view all providers"
  ON ai_providers FOR SELECT
  TO authenticated
  USING (
    COALESCE(
      (SELECT role FROM profiles WHERE user_id = auth.uid() LIMIT 1),
      'free'::user_role
    ) = 'admin'::user_role
  );

CREATE POLICY "Admins can insert providers"
  ON ai_providers FOR INSERT
  TO authenticated
  WITH CHECK (
    COALESCE(
      (SELECT role FROM profiles WHERE user_id = auth.uid() LIMIT 1),
      'free'::user_role
    ) = 'admin'::user_role
  );

CREATE POLICY "Admins can update providers"
  ON ai_providers FOR UPDATE
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

CREATE POLICY "Admins can delete providers"
  ON ai_providers FOR DELETE
  TO authenticated
  USING (
    COALESCE(
      (SELECT role FROM profiles WHERE user_id = auth.uid() LIMIT 1),
      'free'::user_role
    ) = 'admin'::user_role
  );

-- Drop and recreate ai_provider_models admin policies
DROP POLICY IF EXISTS "Admins can view all models" ON ai_provider_models;
DROP POLICY IF EXISTS "Admins can insert models" ON ai_provider_models;
DROP POLICY IF EXISTS "Admins can update models" ON ai_provider_models;
DROP POLICY IF EXISTS "Admins can delete models" ON ai_provider_models;

CREATE POLICY "Admins can view all models"
  ON ai_provider_models FOR SELECT
  TO authenticated
  USING (
    COALESCE(
      (SELECT role FROM profiles WHERE user_id = auth.uid() LIMIT 1),
      'free'::user_role
    ) = 'admin'::user_role
  );

CREATE POLICY "Admins can insert models"
  ON ai_provider_models FOR INSERT
  TO authenticated
  WITH CHECK (
    COALESCE(
      (SELECT role FROM profiles WHERE user_id = auth.uid() LIMIT 1),
      'free'::user_role
    ) = 'admin'::user_role
  );

CREATE POLICY "Admins can update models"
  ON ai_provider_models FOR UPDATE
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

CREATE POLICY "Admins can delete models"
  ON ai_provider_models FOR DELETE
  TO authenticated
  USING (
    COALESCE(
      (SELECT role FROM profiles WHERE user_id = auth.uid() LIMIT 1),
      'free'::user_role
    ) = 'admin'::user_role
  );

-- Drop and recreate ai_feature_routes admin policies
DROP POLICY IF EXISTS "Admins can view all routes" ON ai_feature_routes;
DROP POLICY IF EXISTS "Admins can insert routes" ON ai_feature_routes;
DROP POLICY IF EXISTS "Admins can update routes" ON ai_feature_routes;
DROP POLICY IF EXISTS "Admins can delete routes" ON ai_feature_routes;

CREATE POLICY "Admins can view all routes"
  ON ai_feature_routes FOR SELECT
  TO authenticated
  USING (
    COALESCE(
      (SELECT role FROM profiles WHERE user_id = auth.uid() LIMIT 1),
      'free'::user_role
    ) = 'admin'::user_role
  );

CREATE POLICY "Admins can insert routes"
  ON ai_feature_routes FOR INSERT
  TO authenticated
  WITH CHECK (
    COALESCE(
      (SELECT role FROM profiles WHERE user_id = auth.uid() LIMIT 1),
      'free'::user_role
    ) = 'admin'::user_role
  );

CREATE POLICY "Admins can update routes"
  ON ai_feature_routes FOR UPDATE
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

CREATE POLICY "Admins can delete routes"
  ON ai_feature_routes FOR DELETE
  TO authenticated
  USING (
    COALESCE(
      (SELECT role FROM profiles WHERE user_id = auth.uid() LIMIT 1),
      'free'::user_role
    ) = 'admin'::user_role
  );