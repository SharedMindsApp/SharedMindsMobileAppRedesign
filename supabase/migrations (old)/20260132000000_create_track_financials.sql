/**
 * Phase 3.6: Track Financials Tables
 * 
 * Creates the track_financials and track_expenses tables for budgeting
 * and expense tracking in Track & Subtrack Workspaces.
 * 
 * Financials belong to workspaces, not roadmap.
 * Financials are workspace-owned domain data.
 */

-- Create track_financials table
CREATE TABLE IF NOT EXISTS track_financials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES guardrails_tracks(id) ON DELETE CASCADE,
  subtrack_id uuid REFERENCES guardrails_tracks(id) ON DELETE CASCADE,
  budget_amount numeric(12, 2),
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT track_financials_track_subtrack_check CHECK (
    (subtrack_id IS NULL) OR (track_id != subtrack_id)
  ),
  CONSTRAINT track_financials_unique_track_subtrack UNIQUE (track_id, subtrack_id)
);

-- Create track_expenses table
CREATE TABLE IF NOT EXISTS track_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  financial_id uuid NOT NULL REFERENCES track_financials(id) ON DELETE CASCADE,
  amount numeric(12, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  description text NOT NULL,
  category text,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT track_expenses_amount_positive CHECK (amount > 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_track_financials_track_id ON track_financials(track_id);
CREATE INDEX IF NOT EXISTS idx_track_financials_subtrack_id ON track_financials(subtrack_id) WHERE subtrack_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_track_expenses_financial_id ON track_expenses(financial_id);
CREATE INDEX IF NOT EXISTS idx_track_expenses_expense_date ON track_expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_track_expenses_created_by ON track_expenses(created_by);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_track_financials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_financials_updated_at
  BEFORE UPDATE ON track_financials
  FOR EACH ROW
  EXECUTE FUNCTION update_track_financials_updated_at();

CREATE TRIGGER track_expenses_updated_at
  BEFORE UPDATE ON track_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_track_financials_updated_at();

-- RLS Policies
ALTER TABLE track_financials ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_expenses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view financials for tracks they have access to
CREATE POLICY "Users can view financials for accessible tracks"
  ON track_financials
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM guardrails_tracks t
      WHERE t.id = track_financials.track_id
      AND (
        EXISTS (
          SELECT 1 FROM master_projects mp
          WHERE mp.id = t.master_project_id
          AND mp.user_id = auth.uid()
        )
        OR
        FALSE
      )
    )
  );

-- Policy: Users can insert/update financials for tracks they own
CREATE POLICY "Users can manage financials for owned tracks"
  ON track_financials
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM guardrails_tracks t
      INNER JOIN master_projects mp ON mp.id = t.master_project_id
      WHERE t.id = track_financials.track_id
      AND mp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM guardrails_tracks t
      INNER JOIN master_projects mp ON mp.id = t.master_project_id
      WHERE t.id = track_financials.track_id
      AND mp.user_id = auth.uid()
    )
  );

-- Policy: Users can view expenses for accessible financials
CREATE POLICY "Users can view expenses for accessible financials"
  ON track_expenses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM track_financials tf
      INNER JOIN guardrails_tracks t ON t.id = tf.track_id
      WHERE tf.id = track_expenses.financial_id
      AND (
        EXISTS (
          SELECT 1 FROM master_projects mp
          WHERE mp.id = t.master_project_id
          AND mp.user_id = auth.uid()
        )
        OR
        FALSE
      )
    )
  );

-- Policy: Users can manage expenses for accessible financials
CREATE POLICY "Users can manage expenses for accessible financials"
  ON track_expenses
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM track_financials tf
      INNER JOIN guardrails_tracks t ON t.id = tf.track_id
      INNER JOIN master_projects mp ON mp.id = t.master_project_id
      WHERE tf.id = track_expenses.financial_id
      AND mp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM track_financials tf
      INNER JOIN guardrails_tracks t ON t.id = tf.track_id
      INNER JOIN master_projects mp ON mp.id = t.master_project_id
      WHERE tf.id = track_expenses.financial_id
      AND mp.user_id = auth.uid()
    )
  );

-- Comments
COMMENT ON TABLE track_financials IS 'Budget information for Track & Subtrack Workspaces. Financials belong to workspaces, not roadmap.';
COMMENT ON TABLE track_expenses IS 'Expenses tracked against track/subtrack budgets.';
COMMENT ON COLUMN track_financials.track_id IS 'Parent track ID. Required.';
COMMENT ON COLUMN track_financials.subtrack_id IS 'Subtrack ID if budget belongs to a subtrack. NULL if budget belongs to parent track.';
COMMENT ON COLUMN track_financials.budget_amount IS 'Budget amount. NULL means no budget set.';
COMMENT ON COLUMN track_expenses.financial_id IS 'Reference to track_financials record.';
