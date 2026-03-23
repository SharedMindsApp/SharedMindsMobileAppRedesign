/*
  # Update All Admin Policies to Use Simpler Format

  1. Changes
    - Replace EXISTS subquery with simpler COALESCE pattern
    - More reliable evaluation from frontend
    - Applies to all guardrails metadata tables

  2. Tables Updated
    - guardrails_project_types
    - guardrails_template_tags
    - guardrails_track_template_tags
    - guardrails_project_type_tags
    - guardrails_track_templates
    - guardrails_subtrack_templates
*/

-- guardrails_project_types
DROP POLICY IF EXISTS "Admins can insert project types" ON guardrails_project_types;
DROP POLICY IF EXISTS "Admins can update project types" ON guardrails_project_types;
DROP POLICY IF EXISTS "Admins can delete project types" ON guardrails_project_types;

CREATE POLICY "Admins can insert project types"
  ON guardrails_project_types
  FOR INSERT
  TO authenticated
  WITH CHECK (
    COALESCE(
      (SELECT role FROM profiles WHERE user_id = auth.uid() LIMIT 1),
      'free'::user_role
    ) = 'admin'::user_role
  );

CREATE POLICY "Admins can update project types"
  ON guardrails_project_types
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

CREATE POLICY "Admins can delete project types"
  ON guardrails_project_types
  FOR DELETE
  TO authenticated
  USING (
    COALESCE(
      (SELECT role FROM profiles WHERE user_id = auth.uid() LIMIT 1),
      'free'::user_role
    ) = 'admin'::user_role
  );

-- guardrails_template_tags
DROP POLICY IF EXISTS "Admins can insert template tags" ON guardrails_template_tags;
DROP POLICY IF EXISTS "Admins can update template tags" ON guardrails_template_tags;
DROP POLICY IF EXISTS "Admins can delete template tags" ON guardrails_template_tags;

CREATE POLICY "Admins can insert template tags"
  ON guardrails_template_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (
    COALESCE(
      (SELECT role FROM profiles WHERE user_id = auth.uid() LIMIT 1),
      'free'::user_role
    ) = 'admin'::user_role
  );

CREATE POLICY "Admins can update template tags"
  ON guardrails_template_tags
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

CREATE POLICY "Admins can delete template tags"
  ON guardrails_template_tags
  FOR DELETE
  TO authenticated
  USING (
    COALESCE(
      (SELECT role FROM profiles WHERE user_id = auth.uid() LIMIT 1),
      'free'::user_role
    ) = 'admin'::user_role
  );

-- guardrails_track_template_tags
DROP POLICY IF EXISTS "Admins can insert track template tags" ON guardrails_track_template_tags;
DROP POLICY IF EXISTS "Admins can update track template tags" ON guardrails_track_template_tags;
DROP POLICY IF EXISTS "Admins can delete track template tags" ON guardrails_track_template_tags;

CREATE POLICY "Admins can insert track template tags"
  ON guardrails_track_template_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (
    COALESCE(
      (SELECT role FROM profiles WHERE user_id = auth.uid() LIMIT 1),
      'free'::user_role
    ) = 'admin'::user_role
  );

CREATE POLICY "Admins can update track template tags"
  ON guardrails_track_template_tags
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

CREATE POLICY "Admins can delete track template tags"
  ON guardrails_track_template_tags
  FOR DELETE
  TO authenticated
  USING (
    COALESCE(
      (SELECT role FROM profiles WHERE user_id = auth.uid() LIMIT 1),
      'free'::user_role
    ) = 'admin'::user_role
  );

-- guardrails_project_type_tags
DROP POLICY IF EXISTS "Admins can insert project type tags" ON guardrails_project_type_tags;
DROP POLICY IF EXISTS "Admins can update project type tags" ON guardrails_project_type_tags;
DROP POLICY IF EXISTS "Admins can delete project type tags" ON guardrails_project_type_tags;

CREATE POLICY "Admins can insert project type tags"
  ON guardrails_project_type_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (
    COALESCE(
      (SELECT role FROM profiles WHERE user_id = auth.uid() LIMIT 1),
      'free'::user_role
    ) = 'admin'::user_role
  );

CREATE POLICY "Admins can update project type tags"
  ON guardrails_project_type_tags
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

CREATE POLICY "Admins can delete project type tags"
  ON guardrails_project_type_tags
  FOR DELETE
  TO authenticated
  USING (
    COALESCE(
      (SELECT role FROM profiles WHERE user_id = auth.uid() LIMIT 1),
      'free'::user_role
    ) = 'admin'::user_role
  );

-- guardrails_track_templates
DROP POLICY IF EXISTS "Admins can insert track templates" ON guardrails_track_templates;
DROP POLICY IF EXISTS "Admins can update track templates" ON guardrails_track_templates;
DROP POLICY IF EXISTS "Admins can delete track templates" ON guardrails_track_templates;

CREATE POLICY "Admins can insert track templates"
  ON guardrails_track_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    COALESCE(
      (SELECT role FROM profiles WHERE user_id = auth.uid() LIMIT 1),
      'free'::user_role
    ) = 'admin'::user_role
  );

CREATE POLICY "Admins can update track templates"
  ON guardrails_track_templates
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

CREATE POLICY "Admins can delete track templates"
  ON guardrails_track_templates
  FOR DELETE
  TO authenticated
  USING (
    COALESCE(
      (SELECT role FROM profiles WHERE user_id = auth.uid() LIMIT 1),
      'free'::user_role
    ) = 'admin'::user_role
  );

-- guardrails_subtrack_templates
DROP POLICY IF EXISTS "Admins can insert subtrack templates" ON guardrails_subtrack_templates;
DROP POLICY IF EXISTS "Admins can update subtrack templates" ON guardrails_subtrack_templates;
DROP POLICY IF EXISTS "Admins can delete subtrack templates" ON guardrails_subtrack_templates;

CREATE POLICY "Admins can insert subtrack templates"
  ON guardrails_subtrack_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    COALESCE(
      (SELECT role FROM profiles WHERE user_id = auth.uid() LIMIT 1),
      'free'::user_role
    ) = 'admin'::user_role
  );

CREATE POLICY "Admins can update subtrack templates"
  ON guardrails_subtrack_templates
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

CREATE POLICY "Admins can delete subtrack templates"
  ON guardrails_subtrack_templates
  FOR DELETE
  TO authenticated
  USING (
    COALESCE(
      (SELECT role FROM profiles WHERE user_id = auth.uid() LIMIT 1),
      'free'::user_role
    ) = 'admin'::user_role
  );
