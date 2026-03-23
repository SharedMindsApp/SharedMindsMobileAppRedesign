import { supabase } from './supabase';

// Types
export interface IncomeSource {
  id: string;
  user_id: string;
  source_name: string;
  source_type: 'salary' | 'freelance' | 'benefits' | 'passive' | 'business' | 'investment_income' | 'other';
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual' | 'irregular';
  expected_amount?: number;
  actual_amount?: number;
  currency: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  category: string;
  subcategory?: string;
  amount: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'one_time';
  is_irregular: boolean;
  notes?: string;
  month?: string;
  created_at: string;
  updated_at: string;
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  goal_name: string;
  goal_type: 'emergency_fund' | 'sinking_fund' | 'short_term' | 'medium_term' | 'long_term';
  target_amount: number;
  current_amount: number;
  currency: string;
  target_date?: string;
  purpose?: string;
  priority: number;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Investment {
  id: string;
  user_id: string;
  asset_name: string;
  asset_type: 'cash' | 'property' | 'stocks' | 'bonds' | 'funds' | 'pension' | 'crypto' | 'business' | 'other';
  estimated_value?: number;
  currency: string;
  allocation_percentage?: number;
  risk_level?: 'low' | 'medium' | 'high';
  strategy_notes?: string;
  long_term_intention?: string;
  last_reviewed?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Debt {
  id: string;
  user_id: string;
  debt_name: string;
  debt_type: 'mortgage' | 'student_loan' | 'car_loan' | 'personal_loan' | 'credit_card' | 'other';
  original_amount?: number;
  current_balance: number;
  currency: string;
  interest_rate?: number;
  payment_amount?: number;
  payment_frequency?: 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
  next_payment_date?: string;
  payoff_target_date?: string;
  priority: number;
  emotional_note?: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Insurance {
  id: string;
  user_id: string;
  policy_name: string;
  policy_type: 'health' | 'life' | 'home' | 'auto' | 'disability' | 'liability' | 'other';
  provider?: string;
  policy_number?: string;
  coverage_amount?: number;
  premium_amount?: number;
  premium_frequency?: 'monthly' | 'quarterly' | 'annual';
  renewal_date?: string;
  last_reviewed?: string;
  adequacy_notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RetirementAccount {
  id: string;
  user_id: string;
  account_name: string;
  account_type: '401k' | '403b' | 'ira' | 'roth_ira' | 'pension' | 'annuity' | 'other';
  current_value?: number;
  currency: string;
  contribution_amount?: number;
  contribution_frequency?: 'monthly' | 'annual' | 'irregular';
  employer_match?: string;
  target_retirement_age?: number;
  lifestyle_notes?: string;
  what_is_enough?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FinancialReflection {
  id: string;
  user_id: string;
  reflection_date: string;
  reflection_type: 'monthly' | 'quarterly' | 'annual' | 'ad_hoc';
  title?: string;
  what_went_well?: string;
  what_was_hard?: string;
  emotional_check_in?: string;
  key_insights?: string;
  decisions_made?: string;
  goals_for_next_period?: string;
  linked_journal_entry_id?: string;
  created_at: string;
  updated_at: string;
}

// Income Sources
export async function getIncomeSources() {
  const { data, error } = await supabase
    .from('financial_income_sources')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as IncomeSource[];
}

export async function createIncomeSource(source: Omit<IncomeSource, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('financial_income_sources')
    .insert({ ...source, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as IncomeSource;
}

export async function updateIncomeSource(id: string, updates: Partial<IncomeSource>) {
  const { data, error } = await supabase
    .from('financial_income_sources')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as IncomeSource;
}

export async function deleteIncomeSource(id: string) {
  const { error } = await supabase
    .from('financial_income_sources')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Expenses
export async function getExpenses(month?: string) {
  let query = supabase
    .from('financial_expenses')
    .select('*')
    .order('created_at', { ascending: false });

  if (month) {
    query = query.eq('month', month);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Expense[];
}

export async function createExpense(expense: Omit<Expense, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('financial_expenses')
    .insert({ ...expense, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as Expense;
}

export async function updateExpense(id: string, updates: Partial<Expense>) {
  const { data, error } = await supabase
    .from('financial_expenses')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Expense;
}

export async function deleteExpense(id: string) {
  const { error } = await supabase
    .from('financial_expenses')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Savings Goals
export async function getSavingsGoals() {
  const { data, error } = await supabase
    .from('financial_savings_goals')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: false });

  if (error) throw error;
  return data as SavingsGoal[];
}

export async function createSavingsGoal(goal: Omit<SavingsGoal, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('financial_savings_goals')
    .insert({ ...goal, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as SavingsGoal;
}

export async function updateSavingsGoal(id: string, updates: Partial<SavingsGoal>) {
  const { data, error } = await supabase
    .from('financial_savings_goals')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as SavingsGoal;
}

export async function deleteSavingsGoal(id: string) {
  const { error } = await supabase
    .from('financial_savings_goals')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Investments
export async function getInvestments() {
  const { data, error } = await supabase
    .from('financial_investments')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Investment[];
}

export async function createInvestment(investment: Omit<Investment, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('financial_investments')
    .insert({ ...investment, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as Investment;
}

export async function updateInvestment(id: string, updates: Partial<Investment>) {
  const { data, error } = await supabase
    .from('financial_investments')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Investment;
}

export async function deleteInvestment(id: string) {
  const { error } = await supabase
    .from('financial_investments')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Debts
export async function getDebts() {
  const { data, error } = await supabase
    .from('financial_debts')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: false });

  if (error) throw error;
  return data as Debt[];
}

export async function createDebt(debt: Omit<Debt, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('financial_debts')
    .insert({ ...debt, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as Debt;
}

export async function updateDebt(id: string, updates: Partial<Debt>) {
  const { data, error } = await supabase
    .from('financial_debts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Debt;
}

export async function deleteDebt(id: string) {
  const { error } = await supabase
    .from('financial_debts')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Insurance
export async function getInsurancePolicies() {
  const { data, error } = await supabase
    .from('financial_insurance')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Insurance[];
}

export async function createInsurance(insurance: Omit<Insurance, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('financial_insurance')
    .insert({ ...insurance, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as Insurance;
}

export async function updateInsurance(id: string, updates: Partial<Insurance>) {
  const { data, error } = await supabase
    .from('financial_insurance')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Insurance;
}

export async function deleteInsurance(id: string) {
  const { error } = await supabase
    .from('financial_insurance')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Retirement Accounts
export async function getRetirementAccounts() {
  const { data, error } = await supabase
    .from('financial_retirement_accounts')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as RetirementAccount[];
}

export async function createRetirementAccount(account: Omit<RetirementAccount, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('financial_retirement_accounts')
    .insert({ ...account, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as RetirementAccount;
}

export async function updateRetirementAccount(id: string, updates: Partial<RetirementAccount>) {
  const { data, error } = await supabase
    .from('financial_retirement_accounts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as RetirementAccount;
}

export async function deleteRetirementAccount(id: string) {
  const { error } = await supabase
    .from('financial_retirement_accounts')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Financial Reflections
export async function getFinancialReflections() {
  const { data, error } = await supabase
    .from('financial_reflections')
    .select('*')
    .order('reflection_date', { ascending: false });

  if (error) throw error;
  return data as FinancialReflection[];
}

export async function createFinancialReflection(reflection: Omit<FinancialReflection, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('financial_reflections')
    .insert({ ...reflection, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as FinancialReflection;
}

export async function updateFinancialReflection(id: string, updates: Partial<FinancialReflection>) {
  const { data, error } = await supabase
    .from('financial_reflections')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as FinancialReflection;
}

export async function deleteFinancialReflection(id: string) {
  const { error } = await supabase
    .from('financial_reflections')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
