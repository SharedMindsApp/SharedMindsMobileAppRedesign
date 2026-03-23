/**
 * Financial Service
 * 
 * Phase 3.6: Financials Micro-App Service Layer
 * 
 * Handles budget and expense management for Track & Subtrack Workspaces.
 * All database access goes through this service layer.
 * 
 * ARCHITECTURAL RULES (Non-Negotiable):
 * - ✅ All DB access through this service
 * - ✅ UI components never query Supabase directly
 * - ✅ Errors returned, not thrown blindly
 * - ✅ Financials belong to Workspaces, not Roadmap
 */

import { supabase } from '../../supabase';

export interface TrackFinancials {
  id: string;
  track_id: string;
  subtrack_id: string | null;
  budget_amount: number | null;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface TrackExpense {
  id: string;
  financial_id: string;
  amount: number;
  currency: string;
  description: string;
  category: string | null;
  expense_date: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinancialsWithTotals extends TrackFinancials {
  totalSpent: number;
  remaining: number | null;
}

export interface CreateExpenseInput {
  amount: number;
  description: string;
  category?: string | null;
  expenseDate: string;
}

export interface UpdateExpenseInput {
  amount?: number;
  description?: string;
  category?: string | null;
  expenseDate?: string;
}

/**
 * Get financials for a track (and optionally a subtrack)
 * Returns budget info with calculated totals (spent, remaining)
 */
export async function getTrackFinancials(
  trackId: string,
  subtrackId?: string | null
): Promise<FinancialsWithTotals | null> {
  let query = supabase
    .from('track_financials')
    .select('*')
    .eq('track_id', trackId);

  if (subtrackId !== undefined && subtrackId !== null) {
    query = query.eq('subtrack_id', subtrackId);
  } else {
    query = query.is('subtrack_id', null);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error('[financialService] Error fetching financials:', error);
    throw new Error(`Failed to fetch financials: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const financials = mapDbFinancialsToTrackFinancials(data);

  // Calculate totals
  const expenses = await getTrackExpenses(financials.id);
  const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const remaining = financials.budget_amount !== null 
    ? financials.budget_amount - totalSpent 
    : null;

  return {
    ...financials,
    totalSpent,
    remaining,
  };
}

/**
 * Set budget for a track/subtrack
 * Creates financials record if it doesn't exist, updates if it does
 * null amount = no budget set
 */
export async function setTrackBudget(
  trackId: string,
  subtrackId: string | undefined | null,
  amount: number | null,
  currency: string = 'USD'
): Promise<TrackFinancials> {
  // Check if financials record exists
  let query = supabase
    .from('track_financials')
    .select('id')
    .eq('track_id', trackId);

  if (subtrackId !== undefined && subtrackId !== null) {
    query = query.eq('subtrack_id', subtrackId);
  } else {
    query = query.is('subtrack_id', null);
  }

  const { data: existing } = await query.maybeSingle();

  if (existing) {
    // Update existing record
    const { data, error } = await supabase
      .from('track_financials')
      .update({
        budget_amount: amount,
        currency,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('[financialService] Error updating budget:', error);
      throw new Error(`Failed to update budget: ${error.message}`);
    }

    return mapDbFinancialsToTrackFinancials(data);
  } else {
    // Create new record
    const { data, error } = await supabase
      .from('track_financials')
      .insert({
        track_id: trackId,
        subtrack_id: subtrackId || null,
        budget_amount: amount,
        currency,
      })
      .select()
      .single();

    if (error) {
      console.error('[financialService] Error creating budget:', error);
      throw new Error(`Failed to create budget: ${error.message}`);
    }

    return mapDbFinancialsToTrackFinancials(data);
  }
}

/**
 * Get all expenses for a financials record
 */
export async function getTrackExpenses(financialId: string): Promise<TrackExpense[]> {
  const { data, error } = await supabase
    .from('track_expenses')
    .select('*')
    .eq('financial_id', financialId)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[financialService] Error fetching expenses:', error);
    throw new Error(`Failed to fetch expenses: ${error.message}`);
  }

  return (data || []).map(mapDbExpenseToTrackExpense);
}

/**
 * Create an expense
 * Requires financials record to exist
 */
export async function createExpense(
  financialId: string,
  input: CreateExpenseInput,
  userId: string
): Promise<TrackExpense> {
  // Validate amount
  if (input.amount <= 0) {
    throw new Error('Expense amount must be greater than 0');
  }

  // Get financials to get currency
  const { data: financials, error: financialsError } = await supabase
    .from('track_financials')
    .select('currency')
    .eq('id', financialId)
    .single();

  if (financialsError || !financials) {
    throw new Error('Financials record not found. Budget must be set before adding expenses.');
  }

  const { data, error } = await supabase
    .from('track_expenses')
    .insert({
      financial_id: financialId,
      amount: input.amount,
      currency: financials.currency,
      description: input.description.trim(),
      category: input.category?.trim() || null,
      expense_date: input.expenseDate,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    console.error('[financialService] Error creating expense:', error);
    throw new Error(`Failed to create expense: ${error.message}`);
  }

  return mapDbExpenseToTrackExpense(data);
}

/**
 * Update an expense
 */
export async function updateExpense(
  expenseId: string,
  updates: UpdateExpenseInput
): Promise<TrackExpense> {
  const updateData: any = {};

  if (updates.amount !== undefined) {
    if (updates.amount <= 0) {
      throw new Error('Expense amount must be greater than 0');
    }
    updateData.amount = updates.amount;
  }

  if (updates.description !== undefined) {
    updateData.description = updates.description.trim();
  }

  if (updates.category !== undefined) {
    updateData.category = updates.category?.trim() || null;
  }

  if (updates.expenseDate !== undefined) {
    updateData.expense_date = updates.expenseDate;
  }

  const { data, error } = await supabase
    .from('track_expenses')
    .update(updateData)
    .eq('id', expenseId)
    .select()
    .single();

  if (error) {
    console.error('[financialService] Error updating expense:', error);
    throw new Error(`Failed to update expense: ${error.message}`);
  }

  return mapDbExpenseToTrackExpense(data);
}

/**
 * Delete an expense
 */
export async function deleteExpense(expenseId: string): Promise<void> {
  const { error } = await supabase
    .from('track_expenses')
    .delete()
    .eq('id', expenseId);

  if (error) {
    console.error('[financialService] Error deleting expense:', error);
    throw new Error(`Failed to delete expense: ${error.message}`);
  }
}

/**
 * Map database financials to TrackFinancials interface
 */
function mapDbFinancialsToTrackFinancials(dbFinancials: any): TrackFinancials {
  return {
    id: dbFinancials.id,
    track_id: dbFinancials.track_id,
    subtrack_id: dbFinancials.subtrack_id,
    budget_amount: dbFinancials.budget_amount ? parseFloat(dbFinancials.budget_amount) : null,
    currency: dbFinancials.currency,
    created_at: dbFinancials.created_at,
    updated_at: dbFinancials.updated_at,
  };
}

/**
 * Map database expense to TrackExpense interface
 */
function mapDbExpenseToTrackExpense(dbExpense: any): TrackExpense {
  return {
    id: dbExpense.id,
    financial_id: dbExpense.financial_id,
    amount: parseFloat(dbExpense.amount),
    currency: dbExpense.currency,
    description: dbExpense.description,
    category: dbExpense.category,
    expense_date: dbExpense.expense_date,
    created_by: dbExpense.created_by,
    created_at: dbExpense.created_at,
    updated_at: dbExpense.updated_at,
  };
}
