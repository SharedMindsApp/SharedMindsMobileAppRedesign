/**
 * WorkspaceFinancials Component
 * 
 * Phase 3.6: Financials Micro-App (Workspace)
 * 
 * Budget and expense tracking for Track & Subtrack Workspaces.
 * Financials are workspace-owned domain data.
 * 
 * ARCHITECTURAL RULES (Non-Negotiable):
 * 
 * What this component CAN do:
 * - ✅ Display budget and expenses (via service layer)
 * - ✅ Edit budget (via service layer)
 * - ✅ Create/edit/delete expenses (via service layer)
 * - ✅ Manage local draft state
 * - ✅ Warn about unsaved changes
 * 
 * What this component MUST NOT do:
 * - ❌ Query Supabase directly (use service layer only)
 * - ❌ Render roadmap logic
 * - ❌ Render timeline/bucket logic
 * - ❌ Shape projection data
 * - ❌ Navigate to roadmap
 * 
 * Phase 3.6 Scope:
 * - Read/Write: track_financials, track_expenses (via service layer)
 * - Financials belong to Workspaces, not Roadmap
 */

import { useState, useEffect, useCallback } from 'react';
import { DollarSign, Plus, Edit2, Trash2, X, Save, Loader2, AlertCircle } from 'lucide-react';
import {
  getTrackFinancials,
  setTrackBudget,
  getTrackExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  type FinancialsWithTotals,
  type TrackExpense,
} from '../../../../lib/guardrails/workspace/financialService';
import { useAuth } from '../../../../contexts/AuthContext';

export interface WorkspaceFinancialsProps {
  // Context data
  projectId: string;
  trackId: string; // Parent track ID (for subtracks, this is the parent; for tracks, this is the track)
  subtrackId?: string | null; // Subtrack ID (null for main tracks)
  
  // Callback to notify about unsaved changes (for tab switching guard)
  onUnsavedChangesChange?: (hasUnsavedChanges: boolean) => void;
}

export function WorkspaceFinancials({
  projectId,
  trackId,
  subtrackId = null,
  onUnsavedChangesChange,
}: WorkspaceFinancialsProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [financials, setFinancials] = useState<FinancialsWithTotals | null>(null);
  const [expenses, setExpenses] = useState<TrackExpense[]>([]);
  
  // Budget editing state
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [draftBudgetAmount, setDraftBudgetAmount] = useState<string>('');
  const [originalBudgetAmount, setOriginalBudgetAmount] = useState<number | null>(null);
  const [savingBudget, setSavingBudget] = useState(false);
  
  // Expense editing state
  const [isCreatingExpense, setIsCreatingExpense] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  
  // Expense form state
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expenseDescription, setExpenseDescription] = useState<string>('');
  const [expenseCategory, setExpenseCategory] = useState<string>('');
  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Load financials on mount
  useEffect(() => {
    loadFinancials();
  }, [trackId, subtrackId]);

  const loadFinancials = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const financialsData = await getTrackFinancials(trackId, subtrackId);
      setFinancials(financialsData);

      if (financialsData) {
        const expensesData = await getTrackExpenses(financialsData.id);
        setExpenses(expensesData);
      } else {
        setExpenses([]);
      }
    } catch (err) {
      console.error('[WorkspaceFinancials] Error loading financials:', err);
      setError(err instanceof Error ? err.message : 'Failed to load financials');
    } finally {
      setLoading(false);
    }
  }, [trackId, subtrackId]);

  // Detect unsaved changes (budget editing)
  useEffect(() => {
    const hasBudgetChanges = isEditingBudget && (
      (draftBudgetAmount === '' && originalBudgetAmount !== null) ||
      (draftBudgetAmount !== '' && parseFloat(draftBudgetAmount) !== originalBudgetAmount)
    );
    if (onUnsavedChangesChange) {
      onUnsavedChangesChange(hasBudgetChanges || isCreatingExpense || editingExpenseId !== null);
    }
  }, [isEditingBudget, draftBudgetAmount, originalBudgetAmount, isCreatingExpense, editingExpenseId, onUnsavedChangesChange]);

  // Handle start edit budget
  const handleStartEditBudget = useCallback(() => {
    setIsEditingBudget(true);
    setDraftBudgetAmount(financials?.budget_amount?.toString() || '');
    setOriginalBudgetAmount(financials?.budget_amount || null);
    setError(null);
  }, [financials]);

  // Handle cancel edit budget
  const handleCancelEditBudget = useCallback(() => {
    setIsEditingBudget(false);
    setDraftBudgetAmount('');
    setOriginalBudgetAmount(null);
    setError(null);
  }, []);

  // Handle save budget
  const handleSaveBudget = useCallback(async () => {
    try {
      setSavingBudget(true);
      setError(null);

      const amount = draftBudgetAmount.trim() === '' ? null : parseFloat(draftBudgetAmount);
      if (amount !== null && (isNaN(amount) || amount < 0)) {
        setError('Budget amount must be a positive number');
        return;
      }

      const currency = financials?.currency || 'USD';
      const savedFinancials = await setTrackBudget(trackId, subtrackId, amount, currency);

      // Reload to get updated totals
      await loadFinancials();

      setIsEditingBudget(false);
      setDraftBudgetAmount('');
      setOriginalBudgetAmount(null);
    } catch (err) {
      console.error('[WorkspaceFinancials] Error saving budget:', err);
      setError(err instanceof Error ? err.message : 'Failed to save budget');
    } finally {
      setSavingBudget(false);
    }
  }, [draftBudgetAmount, trackId, subtrackId, financials?.currency, loadFinancials]);

  // Handle start create expense
  const handleStartCreateExpense = useCallback(() => {
    if (!financials) {
      setError('Budget must be set before adding expenses');
      return;
    }
    setIsCreatingExpense(true);
    setExpenseAmount('');
    setExpenseDescription('');
    setExpenseCategory('');
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setError(null);
  }, [financials]);

  // Handle cancel create expense
  const handleCancelCreateExpense = useCallback(() => {
    setIsCreatingExpense(false);
    setExpenseAmount('');
    setExpenseDescription('');
    setExpenseCategory('');
    setError(null);
  }, []);

  // Handle save create expense
  const handleSaveCreateExpense = useCallback(async () => {
    if (!financials || !user?.id) {
      setError('User not authenticated or budget not set');
      return;
    }

    if (!expenseAmount.trim() || !expenseDescription.trim()) {
      setError('Amount and description are required');
      return;
    }

    const amount = parseFloat(expenseAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    try {
      setError(null);

      await createExpense(financials.id, {
        amount,
        description: expenseDescription.trim(),
        category: expenseCategory.trim() || null,
        expenseDate: expenseDate,
      }, user.id);

      await loadFinancials();

      setIsCreatingExpense(false);
      setExpenseAmount('');
      setExpenseDescription('');
      setExpenseCategory('');
    } catch (err) {
      console.error('[WorkspaceFinancials] Error creating expense:', err);
      setError(err instanceof Error ? err.message : 'Failed to create expense');
    }
  }, [financials, user?.id, expenseAmount, expenseDescription, expenseCategory, expenseDate, loadFinancials]);

  // Handle start edit expense
  const handleStartEditExpense = useCallback((expense: TrackExpense) => {
    setEditingExpenseId(expense.id);
    setExpenseAmount(expense.amount.toString());
    setExpenseDescription(expense.description);
    setExpenseCategory(expense.category || '');
    setExpenseDate(expense.expense_date);
    setError(null);
  }, []);

  // Handle cancel edit expense
  const handleCancelEditExpense = useCallback(() => {
    setEditingExpenseId(null);
    setExpenseAmount('');
    setExpenseDescription('');
    setExpenseCategory('');
    setError(null);
  }, []);

  // Handle save edit expense
  const handleSaveEditExpense = useCallback(async (expenseId: string) => {
    if (!expenseDescription.trim()) {
      setError('Description is required');
      return;
    }

    const amount = parseFloat(expenseAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    try {
      setError(null);

      await updateExpense(expenseId, {
        amount,
        description: expenseDescription.trim(),
        category: expenseCategory.trim() || null,
        expenseDate: expenseDate,
      });

      await loadFinancials();

      setEditingExpenseId(null);
      setExpenseAmount('');
      setExpenseDescription('');
      setExpenseCategory('');
    } catch (err) {
      console.error('[WorkspaceFinancials] Error updating expense:', err);
      setError(err instanceof Error ? err.message : 'Failed to update expense');
    }
  }, [expenseAmount, expenseDescription, expenseCategory, expenseDate, loadFinancials]);

  // Handle delete expense
  const handleDeleteExpense = useCallback(async (expenseId: string) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) {
      return;
    }

    try {
      setDeletingExpenseId(expenseId);
      setError(null);

      await deleteExpense(expenseId);
      await loadFinancials();
    } catch (err) {
      console.error('[WorkspaceFinancials] Error deleting expense:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete expense');
    } finally {
      setDeletingExpenseId(null);
    }
  }, [loadFinancials]);

  // Format currency
  const formatCurrency = (amount: number | null, currency: string = 'USD'): string => {
    if (amount === null) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading financials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto w-full space-y-6">
          {/* Error banner */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              <div className="flex items-start gap-2">
                <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Error</p>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Budget Overview Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <DollarSign size={20} className="text-green-600" />
                Budget Overview
              </h3>
              {!isEditingBudget && financials && (
                <button
                  onClick={handleStartEditBudget}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Edit2 size={16} />
                  <span>Edit</span>
                </button>
              )}
            </div>

            {!financials ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">No budget set</p>
                <button
                  onClick={handleStartEditBudget}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Plus size={16} />
                  <span>Set a budget</span>
                </button>
              </div>
            ) : isEditingBudget ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Budget Amount ({financials.currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={draftBudgetAmount}
                    onChange={(e) => setDraftBudgetAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                  <p className="text-sm text-gray-500 mt-1">Leave empty to clear budget</p>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={handleCancelEditBudget}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    disabled={savingBudget}
                  >
                    <X size={16} className="inline-block mr-2" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveBudget}
                    className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    disabled={savingBudget}
                  >
                    {savingBudget ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        <span>Save</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Budget</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatCurrency(financials.budget_amount, financials.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total Spent</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatCurrency(financials.totalSpent, financials.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Remaining</p>
                  <p className={`text-2xl font-semibold ${
                    financials.remaining !== null && financials.remaining < 0 
                      ? 'text-red-600' 
                      : 'text-gray-900'
                  }`}>
                    {formatCurrency(financials.remaining, financials.currency)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Expenses Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Expenses</h3>
              {!isCreatingExpense && financials && (
                <button
                  onClick={handleStartCreateExpense}
                  disabled={!financials || editingExpenseId !== null}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={16} />
                  <span>Add Expense</span>
                </button>
              )}
            </div>

            {/* Create Expense Form */}
            {isCreatingExpense && (
              <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-gray-900 mb-4">New Expense</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount ({financials?.currency || 'USD'}) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={expenseAmount}
                        onChange={(e) => setExpenseAmount(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={expenseDate}
                        onChange={(e) => setExpenseDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={expenseDescription}
                      onChange={(e) => setExpenseDescription(e.target.value)}
                      placeholder="What was this expense for?"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category (optional)
                    </label>
                    <input
                      type="text"
                      value={expenseCategory}
                      onChange={(e) => setExpenseCategory(e.target.value)}
                      placeholder="e.g., Equipment, Travel, Software"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={handleCancelCreateExpense}
                      className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <X size={16} className="inline-block mr-2" />
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveCreateExpense}
                      className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <Save size={16} />
                      <span>Save</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Expenses List */}
            {expenses.length === 0 && !isCreatingExpense ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">No expenses yet</p>
                {!financials && (
                  <p className="text-sm text-gray-500">Set a budget first to start tracking expenses</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {expenses.map((expense) => {
                  const isEditing = editingExpenseId === expense.id;
                  const isDeleting = deletingExpenseId === expense.id;

                  return (
                    <div
                      key={expense.id}
                      className={`border rounded-lg p-4 ${
                        isEditing ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'
                      }`}
                    >
                      {isEditing ? (
                        <div className="space-y-4">
                          <h4 className="font-medium text-gray-900">Edit Expense</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Amount ({financials?.currency || 'USD'}) <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={expenseAmount}
                                onChange={(e) => setExpenseAmount(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Date <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="date"
                                value={expenseDate}
                                onChange={(e) => setExpenseDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Description <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={expenseDescription}
                              onChange={(e) => setExpenseDescription(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Category (optional)
                            </label>
                            <input
                              type="text"
                              value={expenseCategory}
                              onChange={(e) => setExpenseCategory(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div className="flex justify-end gap-3">
                            <button
                              onClick={handleCancelEditExpense}
                              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <X size={16} className="inline-block mr-2" />
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveEditExpense(expense.id)}
                              className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                            >
                              <Save size={16} />
                              <span>Save</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 mb-1">{expense.description}</p>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                              <span>{formatCurrency(expense.amount, expense.currency)}</span>
                              {expense.category && (
                                <>
                                  <span>•</span>
                                  <span>{expense.category}</span>
                                </>
                              )}
                              <span>•</span>
                              <span>{formatDate(expense.expense_date)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <button
                              onClick={() => handleStartEditExpense(expense)}
                              disabled={isDeleting || isCreatingExpense || editingExpenseId !== null}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              aria-label="Edit"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteExpense(expense.id)}
                              disabled={isDeleting || isCreatingExpense || editingExpenseId !== null}
                              className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              aria-label="Delete"
                            >
                              {isDeleting ? (
                                <Loader2 size={18} className="animate-spin" />
                              ) : (
                                <Trash2 size={18} />
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
