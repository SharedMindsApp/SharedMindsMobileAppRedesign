/*
  # Finance & Wealth Planning System

  1. New Tables
    - `financial_income_sources`
      - Track income streams (salary, freelance, passive, etc.)
      - Frequency tracking (monthly, weekly, irregular)
      - Expected vs actual amounts
    
    - `financial_expenses`
      - High-level expense tracking
      - Categories and monthly overview
      - Integration with budget system
    
    - `financial_savings_goals`
      - Savings targets and emergency funds
      - Progress tracking
      - Purpose and security focus
    
    - `financial_investments`
      - Asset tracking (no live prices)
      - Allocation and strategy notes
      - Long-term intention
    
    - `financial_debts`
      - Loan and commitment tracking
      - Payment schedules
      - Emotional context support
    
    - `financial_insurance`
      - Insurance policy tracking
      - Coverage and renewal management
      - Review reminders
    
    - `financial_retirement_accounts`
      - Retirement planning
      - Long-term goals
      - Lifestyle assumptions
    
    - `financial_reflections`
      - Monthly/annual money reviews
      - Emotional check-ins
      - Narrative reflections

  2. Security
    - Enable RLS on all tables
    - Users can only access their own financial data

  3. Integration Points
    - Links to budget system
    - Links to journal entries
    - Links to tasks and reminders
*/

-- Income Sources
CREATE TABLE IF NOT EXISTS financial_income_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  source_name text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('salary', 'freelance', 'benefits', 'passive', 'business', 'investment_income', 'other')),
  frequency text NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'annual', 'irregular')),
  expected_amount numeric(12,2),
  actual_amount numeric(12,2),
  currency text DEFAULT 'USD',
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Expenses
CREATE TABLE IF NOT EXISTS financial_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category text NOT NULL,
  subcategory text,
  amount numeric(12,2) NOT NULL,
  frequency text NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'annual', 'one_time')),
  is_irregular boolean DEFAULT false,
  notes text,
  month date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Savings Goals
CREATE TABLE IF NOT EXISTS financial_savings_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  goal_name text NOT NULL,
  goal_type text NOT NULL CHECK (goal_type IN ('emergency_fund', 'sinking_fund', 'short_term', 'medium_term', 'long_term')),
  target_amount numeric(12,2) NOT NULL,
  current_amount numeric(12,2) DEFAULT 0,
  currency text DEFAULT 'USD',
  target_date date,
  purpose text,
  priority integer DEFAULT 0,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Investments & Assets
CREATE TABLE IF NOT EXISTS financial_investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  asset_name text NOT NULL,
  asset_type text NOT NULL CHECK (asset_type IN ('cash', 'property', 'stocks', 'bonds', 'funds', 'pension', 'crypto', 'business', 'other')),
  estimated_value numeric(12,2),
  currency text DEFAULT 'USD',
  allocation_percentage numeric(5,2),
  risk_level text CHECK (risk_level IN ('low', 'medium', 'high')),
  strategy_notes text,
  long_term_intention text,
  last_reviewed date,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Debts & Commitments
CREATE TABLE IF NOT EXISTS financial_debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  debt_name text NOT NULL,
  debt_type text NOT NULL CHECK (debt_type IN ('mortgage', 'student_loan', 'car_loan', 'personal_loan', 'credit_card', 'other')),
  original_amount numeric(12,2),
  current_balance numeric(12,2) NOT NULL,
  currency text DEFAULT 'USD',
  interest_rate numeric(5,2),
  payment_amount numeric(12,2),
  payment_frequency text CHECK (payment_frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly')),
  next_payment_date date,
  payoff_target_date date,
  priority integer DEFAULT 0,
  emotional_note text,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insurance Policies
CREATE TABLE IF NOT EXISTS financial_insurance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  policy_name text NOT NULL,
  policy_type text NOT NULL CHECK (policy_type IN ('health', 'life', 'home', 'auto', 'disability', 'liability', 'other')),
  provider text,
  policy_number text,
  coverage_amount numeric(12,2),
  premium_amount numeric(12,2),
  premium_frequency text CHECK (premium_frequency IN ('monthly', 'quarterly', 'annual')),
  renewal_date date,
  last_reviewed date,
  adequacy_notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Retirement Accounts
CREATE TABLE IF NOT EXISTS financial_retirement_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_name text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('401k', '403b', 'ira', 'roth_ira', 'pension', 'annuity', 'other')),
  current_value numeric(12,2),
  currency text DEFAULT 'USD',
  contribution_amount numeric(12,2),
  contribution_frequency text CHECK (contribution_frequency IN ('monthly', 'annual', 'irregular')),
  employer_match text,
  target_retirement_age integer,
  lifestyle_notes text,
  what_is_enough text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Financial Reflections
CREATE TABLE IF NOT EXISTS financial_reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reflection_date date NOT NULL,
  reflection_type text NOT NULL CHECK (reflection_type IN ('monthly', 'quarterly', 'annual', 'ad_hoc')),
  title text,
  what_went_well text,
  what_was_hard text,
  emotional_check_in text,
  key_insights text,
  decisions_made text,
  goals_for_next_period text,
  linked_journal_entry_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_income_sources_user ON financial_income_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user ON financial_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_month ON financial_expenses(month);
CREATE INDEX IF NOT EXISTS idx_savings_goals_user ON financial_savings_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_user ON financial_investments(user_id);
CREATE INDEX IF NOT EXISTS idx_debts_user ON financial_debts(user_id);
CREATE INDEX IF NOT EXISTS idx_insurance_user ON financial_insurance(user_id);
CREATE INDEX IF NOT EXISTS idx_retirement_user ON financial_retirement_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_reflections_user ON financial_reflections(user_id);
CREATE INDEX IF NOT EXISTS idx_reflections_date ON financial_reflections(reflection_date);

-- Enable RLS
ALTER TABLE financial_income_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_insurance ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_retirement_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_reflections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Income Sources
CREATE POLICY "Users can view own income sources"
  ON financial_income_sources FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own income sources"
  ON financial_income_sources FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own income sources"
  ON financial_income_sources FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own income sources"
  ON financial_income_sources FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for Expenses
CREATE POLICY "Users can view own expenses"
  ON financial_expenses FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own expenses"
  ON financial_expenses FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own expenses"
  ON financial_expenses FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own expenses"
  ON financial_expenses FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for Savings Goals
CREATE POLICY "Users can view own savings goals"
  ON financial_savings_goals FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own savings goals"
  ON financial_savings_goals FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own savings goals"
  ON financial_savings_goals FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own savings goals"
  ON financial_savings_goals FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for Investments
CREATE POLICY "Users can view own investments"
  ON financial_investments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own investments"
  ON financial_investments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own investments"
  ON financial_investments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own investments"
  ON financial_investments FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for Debts
CREATE POLICY "Users can view own debts"
  ON financial_debts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own debts"
  ON financial_debts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own debts"
  ON financial_debts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own debts"
  ON financial_debts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for Insurance
CREATE POLICY "Users can view own insurance"
  ON financial_insurance FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own insurance"
  ON financial_insurance FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own insurance"
  ON financial_insurance FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own insurance"
  ON financial_insurance FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for Retirement Accounts
CREATE POLICY "Users can view own retirement accounts"
  ON financial_retirement_accounts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own retirement accounts"
  ON financial_retirement_accounts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own retirement accounts"
  ON financial_retirement_accounts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own retirement accounts"
  ON financial_retirement_accounts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for Reflections
CREATE POLICY "Users can view own reflections"
  ON financial_reflections FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own reflections"
  ON financial_reflections FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own reflections"
  ON financial_reflections FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own reflections"
  ON financial_reflections FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());