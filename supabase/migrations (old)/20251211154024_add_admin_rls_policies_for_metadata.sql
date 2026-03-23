/*
  # Add Admin RLS Policies for Guardrails Metadata

  1. Add Admin Policies
    - Allow admins to INSERT, UPDATE, DELETE on:
      - guardrails_project_types
      - guardrails_track_templates
      - guardrails_subtrack_templates
      - guardrails_template_tags
      - guardrails_track_template_tags
      - guardrails_project_type_tags
      - guardrails_user_track_templates
      - guardrails_user_subtrack_templates

  2. Notes
    - Users already have SELECT access via existing policies
    - Only users with role='admin' can modify metadata
    - Admin role is checked via profiles.role column
*/

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for guardrails_project_types
CREATE POLICY "Admins can insert project types"
  ON guardrails_project_types
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update project types"
  ON guardrails_project_types
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete project types"
  ON guardrails_project_types
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- Policies for guardrails_template_tags
CREATE POLICY "Admins can insert template tags"
  ON guardrails_template_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update template tags"
  ON guardrails_template_tags
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete template tags"
  ON guardrails_template_tags
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- Policies for guardrails_track_template_tags
CREATE POLICY "Admins can insert track template tags"
  ON guardrails_track_template_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update track template tags"
  ON guardrails_track_template_tags
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete track template tags"
  ON guardrails_track_template_tags
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- Policies for guardrails_project_type_tags
CREATE POLICY "Admins can insert project type tags"
  ON guardrails_project_type_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update project type tags"
  ON guardrails_project_type_tags
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete project type tags"
  ON guardrails_project_type_tags
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- Policies for guardrails_track_templates
CREATE POLICY "Admins can insert track templates"
  ON guardrails_track_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update track templates"
  ON guardrails_track_templates
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete track templates"
  ON guardrails_track_templates
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- Policies for guardrails_subtrack_templates
CREATE POLICY "Admins can insert subtrack templates"
  ON guardrails_subtrack_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update subtrack templates"
  ON guardrails_subtrack_templates
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete subtrack templates"
  ON guardrails_subtrack_templates
  FOR DELETE
  TO authenticated
  USING (is_admin());