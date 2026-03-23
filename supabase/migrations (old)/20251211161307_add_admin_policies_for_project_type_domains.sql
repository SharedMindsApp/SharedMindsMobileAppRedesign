/*
  # Add Admin Policies for Project Type Domains

  1. Security
    - Allow admins to insert project type domains
    - Allow admins to update project type domains
    - Allow admins to delete project type domains

  2. Notes
    - Extends existing read-only access for authenticated users
    - Admins have full control over project type domain assignments
*/

CREATE POLICY "Admins can insert project type domains"
  ON guardrails_project_type_domains
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update project type domains"
  ON guardrails_project_type_domains
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete project type domains"
  ON guardrails_project_type_domains
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
