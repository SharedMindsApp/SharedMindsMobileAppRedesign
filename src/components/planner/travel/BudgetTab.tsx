import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { Plus, Edit2, Trash2, DollarSign, ChevronDown, ChevronUp, Calculator, Receipt, Loader2 } from 'lucide-react';
import * as travelService from '../../../lib/travelService';
import type { TripBudgetCategory, TripExpense, TripAccommodation, TripItineraryItem } from '../../../lib/travelService';
import { showToast } from '../../Toast';
import { ConfirmDialogInline } from '../../ConfirmDialogInline';

const BUDGET_CATEGORIES = [
  { value: 'transport', label: 'Transport', icon: '✈️' },
  { value: 'accommodation', label: 'Accommodation', icon: '🏨' },
  { value: 'food', label: 'Food & Dining', icon: '🍽️' },
  { value: 'activities', label: 'Activities', icon: '🎯' },
  { value: 'shopping', label: 'Shopping', icon: '🛍️' },
  { value: 'other', label: 'Other', icon: '💼' },
];

interface BudgetTabProps {
  tripId: string;
  userId: string;
  canManage: boolean;
  accommodations: TripAccommodation[];
  itinerary: TripItineraryItem[];
}

export function BudgetTab({ tripId, userId, canManage, accommodations, itinerary }: BudgetTabProps) {
  const { user } = useAuth();
  const [budgetCategories, setBudgetCategories] = useState<TripBudgetCategory[]>([]);
  const [expenses, setExpenses] = useState<TripExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExpenses, setShowExpenses] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TripBudgetCategory | null>(null);
  const [editingExpense, setEditingExpense] = useState<TripExpense | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'category' | 'expense'; id: string } | null>(null);

  useEffect(() => {
    loadBudgetData();
  }, [tripId]);

  async function loadBudgetData() {
    try {
      setLoading(true);
      const [budgetData, expensesData] = await Promise.all([
        travelService.getTripBudget(tripId),
        travelService.getTripExpenses(tripId),
      ]);
      setBudgetCategories(budgetData);
      setExpenses(expensesData);
    } catch (error) {
      console.error('Error loading budget data:', error);
      showToast('error', 'Failed to load budget data');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveCategory(formData: { category: string; amount: number; currency: string }) {
    try {
      if (editingCategory) {
        await travelService.updateBudgetCategory(editingCategory.id, {
          budgeted_amount: formData.amount,
          currency: formData.currency,
        });
        showToast('success', 'Budget category updated');
      } else {
        // Check if category already exists
        const existing = budgetCategories.find(c => c.category === formData.category);
        if (existing) {
          showToast('error', 'This category already exists. Please edit the existing one.');
          return;
        }
        await travelService.createBudgetCategory({
          trip_id: tripId,
          category: formData.category as any,
          budgeted_amount: formData.amount,
          currency: formData.currency,
        });
        showToast('success', 'Budget category added');
      }
      await loadBudgetData();
      setShowCategoryModal(false);
      setEditingCategory(null);
    } catch (error) {
      console.error('Error saving category:', error);
      showToast('error', 'Failed to save budget category');
    }
  }

  async function handleDeleteCategory(categoryId: string) {
    try {
      await travelService.deleteBudgetCategory(categoryId);
      await loadBudgetData();
      setDeleteConfirm(null);
      showToast('success', 'Budget category removed');
    } catch (error) {
      console.error('Error deleting category:', error);
      showToast('error', 'Failed to delete category');
    }
  }

  async function handleSaveExpense(formData: {
    date: string;
    description: string;
    amount: number;
    currency: string;
    categoryId?: string;
    notes?: string;
  }) {
    if (!user) return;

    try {
      if (editingExpense) {
        await travelService.updateExpense(editingExpense.id, {
          date: formData.date,
          description: formData.description,
          amount: formData.amount,
          currency: formData.currency,
          budget_category_id: formData.categoryId || null,
          notes: formData.notes || null,
        });
        showToast('success', 'Expense updated');
      } else {
        await travelService.createExpense({
          trip_id: tripId,
          date: formData.date,
          description: formData.description,
          amount: formData.amount,
          currency: formData.currency,
          paid_by: user.id,
          budget_category_id: formData.categoryId || null,
          notes: formData.notes || null,
        });
        showToast('success', 'Expense recorded');
      }
      await loadBudgetData();
      setShowExpenseModal(false);
      setEditingExpense(null);
    } catch (error) {
      console.error('Error saving expense:', error);
      showToast('error', 'Failed to save expense');
    }
  }

  async function handleDeleteExpense(expenseId: string) {
    try {
      await travelService.deleteExpense(expenseId);
      await loadBudgetData();
      setDeleteConfirm(null);
      showToast('success', 'Expense deleted');
    } catch (error) {
      console.error('Error deleting expense:', error);
      showToast('error', 'Failed to delete expense');
    }
  }

  // Calculate totals
  const budgetTotal = budgetCategories.reduce((sum, cat) => sum + (cat.budgeted_amount || 0), 0);
  const expensesTotal = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const currency = budgetCategories[0]?.currency || expenses[0]?.currency || 'USD';

  // Calculate estimated costs from accommodations and itinerary
  const accommodationCosts = accommodations
    .filter(acc => acc.cost)
    .reduce((sum, acc) => sum + (acc.cost || 0), 0);
  const itineraryCosts = itinerary
    .filter(item => item.cost)
    .reduce((sum, item) => sum + (item.cost || 0), 0);
  const estimatedFromItems = accommodationCosts + itineraryCosts;

  // Group expenses by category
  const expensesByCategory = expenses.reduce((acc, exp) => {
    const categoryId = exp.budget_category_id || 'uncategorized';
    if (!acc[categoryId]) {
      acc[categoryId] = [];
    }
    acc[categoryId].push(exp);
    return acc;
  }, {} as Record<string, TripExpense[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-slate-600 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Budget Plan Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Budget Plan
          </h2>
          {canManage && (
            <button
              onClick={() => {
                setEditingCategory(null);
                setShowCategoryModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium rounded-lg shadow-sm hover:shadow-md transition-all"
            >
              <Plus size={16} />
              <span>Add Category</span>
            </button>
          )}
        </div>

        {/* Budget Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200 p-4">
            <div className="text-sm text-slate-600 mb-1">Planned Budget</div>
            <div className="text-2xl font-bold text-slate-800">
              {formatCurrency(budgetTotal, currency)}
            </div>
          </div>
          {estimatedFromItems > 0 && (
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-4">
              <div className="text-sm text-slate-600 mb-1">Estimated from Items</div>
              <div className="text-2xl font-bold text-slate-800">
                {formatCurrency(estimatedFromItems, currency)}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                From accommodations & itinerary
              </div>
            </div>
          )}
          {expenses.length > 0 && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-4">
              <div className="text-sm text-slate-600 mb-1">Recorded Spend</div>
              <div className="text-2xl font-bold text-slate-800">
                {formatCurrency(expensesTotal, currency)}
              </div>
            </div>
          )}
        </div>

        {/* Budget Categories */}
        {budgetCategories.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
            <Calculator className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No budget plan yet</h3>
            <p className="text-sm text-gray-600 mb-6">Start planning your trip budget by category</p>
            {canManage && (
              <button
                onClick={() => {
                  setEditingCategory(null);
                  setShowCategoryModal(true);
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all"
              >
                <Plus size={18} />
                <span>Add First Category</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {BUDGET_CATEGORIES.map(cat => {
              const budgetCat = budgetCategories.find(c => c.category === cat.value);
              if (!budgetCat || budgetCat.budgeted_amount === 0) return null;

              const categoryExpenses = expenses.filter(e => e.budget_category_id === budgetCat.id);
              const categorySpent = categoryExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

              return (
                <div key={cat.value} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{cat.icon}</span>
                      <div>
                        <h3 className="font-semibold text-slate-800">{cat.label}</h3>
                        <div className="text-sm text-slate-600">
                          Budgeted: {formatCurrency(budgetCat.budgeted_amount, budgetCat.currency)}
                        </div>
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingCategory(budgetCat);
                            setShowCategoryModal(true);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ type: 'category', id: budgetCat.id })}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Remove"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                  {categoryExpenses.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <div className="text-xs text-slate-600">
                        Recorded: {formatCurrency(categorySpent, budgetCat.currency)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Actual Spend Section (Collapsible) */}
      {expenses.length > 0 && (
        <div className="mb-8">
          <button
            onClick={() => setShowExpenses(!showExpenses)}
            className="w-full flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-800">Recorded Spend</h2>
              <span className="text-sm text-slate-500">({expenses.length} expenses)</span>
            </div>
            {showExpenses ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>

          {showExpenses && (
            <div className="mt-4 space-y-3">
              {expenses.map(expense => {
                const category = budgetCategories.find(c => c.id === expense.budget_category_id);
                return (
                  <div key={expense.id} className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-slate-800">{expense.description}</span>
                          {category && (
                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                              {BUDGET_CATEGORIES.find(c => c.value === category.category)?.label}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-slate-600">
                          {new Date(expense.date).toLocaleDateString()} • {formatCurrency(expense.amount, expense.currency)}
                        </div>
                        {expense.notes && (
                          <div className="text-xs text-slate-500 mt-1">{expense.notes}</div>
                        )}
                      </div>
                      {canManage && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingExpense(expense);
                              setShowExpenseModal(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ type: 'expense', id: expense.id })}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {canManage && (
            <div className="mt-4">
              <button
                onClick={() => {
                  setEditingExpense(null);
                  setShowExpenseModal(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm text-cyan-600 hover:text-cyan-700 border border-cyan-300 rounded-lg hover:bg-cyan-50 transition-colors"
              >
                <Plus size={16} />
                <span>Record Expense</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add Expense Button (if no expenses yet) */}
      {expenses.length === 0 && canManage && (
        <div className="text-center py-8 bg-white rounded-xl border-2 border-dashed border-gray-300">
          <Receipt className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600 mb-4">Optionally record actual expenses</p>
          <button
            onClick={() => {
              setEditingExpense(null);
              setShowExpenseModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-cyan-600 hover:text-cyan-700 border border-cyan-300 rounded-lg hover:bg-cyan-50 transition-colors"
          >
            <Plus size={16} />
            <span>Record First Expense</span>
          </button>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <CategoryModal
          category={editingCategory}
          existingCategories={budgetCategories}
          onSave={handleSaveCategory}
          onClose={() => {
            setShowCategoryModal(false);
            setEditingCategory(null);
          }}
        />
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
        <ExpenseModal
          expense={editingExpense}
          budgetCategories={budgetCategories}
          onSave={handleSaveExpense}
          onClose={() => {
            setShowExpenseModal(false);
            setEditingExpense(null);
          }}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <ConfirmDialogInline
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={() => {
            if (deleteConfirm.type === 'category') {
              handleDeleteCategory(deleteConfirm.id);
            } else {
              handleDeleteExpense(deleteConfirm.id);
            }
          }}
          title={`Delete ${deleteConfirm.type === 'category' ? 'Category' : 'Expense'}`}
          message={`Are you sure you want to delete this ${deleteConfirm.type === 'category' ? 'budget category' : 'expense'}?`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
        />
      )}
    </div>
  );
}

// Helper function
function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

// Category Modal
function CategoryModal({
  category,
  existingCategories,
  onSave,
  onClose,
}: {
  category: TripBudgetCategory | null;
  existingCategories: TripBudgetCategory[];
  onSave: (data: { category: string; amount: number; currency: string }) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    category: category?.category || '',
    amount: category?.budgeted_amount || 0,
    currency: category?.currency || 'USD',
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.category || formData.amount <= 0) return;
    onSave(formData);
  }

  const availableCategories = BUDGET_CATEGORIES.filter(
    cat => !existingCategories.some(ec => ec.category === cat.value && ec.id !== category?.id)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">
            {category ? 'Edit Budget Category' : 'Add Budget Category'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
                disabled={!!category}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:bg-gray-100"
              >
                <option value="">Select category</option>
                {(category ? BUDGET_CATEGORIES : availableCategories).map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Budgeted Amount *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Currency</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="JPY">JPY (¥)</option>
                <option value="CAD">CAD (C$)</option>
                <option value="AUD">AUD (A$)</option>
              </select>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors font-medium text-sm"
              >
                {category ? 'Save Changes' : 'Add Category'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Expense Modal
function ExpenseModal({
  expense,
  budgetCategories,
  onSave,
  onClose,
}: {
  expense: TripExpense | null;
  budgetCategories: TripBudgetCategory[];
  onSave: (data: {
    date: string;
    description: string;
    amount: number;
    currency: string;
    categoryId?: string;
    notes?: string;
  }) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    date: expense?.date ? expense.date.split('T')[0] : new Date().toISOString().split('T')[0],
    description: expense?.description || '',
    amount: expense?.amount || 0,
    currency: expense?.currency || 'USD',
    categoryId: expense?.budget_category_id || '',
    notes: expense?.notes || '',
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.description.trim() || formData.amount <= 0) return;
    onSave({
      date: formData.date,
      description: formData.description.trim(),
      amount: formData.amount,
      currency: formData.currency,
      categoryId: formData.categoryId || undefined,
      notes: formData.notes.trim() || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">
            {expense ? 'Edit Expense' : 'Record Expense'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Date *</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Description *</label>
              <input
                type="text"
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Hotel booking, Restaurant dinner..."
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Amount *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Currency</label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="JPY">JPY (¥)</option>
                  <option value="CAD">CAD (C$)</option>
                  <option value="AUD">AUD (A$)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Category (optional)</label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                <option value="">No category</option>
                {budgetCategories.map(cat => {
                  const catInfo = BUDGET_CATEGORIES.find(c => c.value === cat.category);
                  return (
                    <option key={cat.id} value={cat.id}>
                      {catInfo?.icon} {catInfo?.label}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Notes (optional)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional details..."
                rows={2}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors font-medium text-sm"
              >
                {expense ? 'Save Changes' : 'Record Expense'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
