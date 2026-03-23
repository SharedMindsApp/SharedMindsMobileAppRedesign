import { useEffect, useState } from 'react';
import { Plus, CreditCard, Calendar, Edit2, Trash2, AlertCircle } from 'lucide-react';
import { PlannerShell } from '../PlannerShell';
import {
  getDebts,
  createDebt,
  updateDebt,
  deleteDebt,
  type Debt
} from '../../../lib/financeService';

export function DebtsAndCommitments() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    debt_name: '',
    debt_type: 'personal_loan' as Debt['debt_type'],
    original_amount: '',
    current_balance: '',
    interest_rate: '',
    payment_amount: '',
    payment_frequency: 'monthly' as Debt['payment_frequency'],
    next_payment_date: '',
    payoff_target_date: '',
    priority: 0,
    emotional_note: '',
    notes: '',
    currency: 'USD',
    is_active: true
  });

  useEffect(() => {
    loadDebts();
  }, []);

  async function loadDebts() {
    try {
      const data = await getDebts();
      setDebts(data);
    } catch (error) {
      console.error('Error loading debts:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        original_amount: formData.original_amount ? parseFloat(formData.original_amount) : undefined,
        current_balance: parseFloat(formData.current_balance),
        interest_rate: formData.interest_rate ? parseFloat(formData.interest_rate) : undefined,
        payment_amount: formData.payment_amount ? parseFloat(formData.payment_amount) : undefined,
        next_payment_date: formData.next_payment_date || undefined,
        payoff_target_date: formData.payoff_target_date || undefined
      };

      if (editingId) {
        await updateDebt(editingId, data);
      } else {
        await createDebt(data);
      }

      await loadDebts();
      resetForm();
    } catch (error) {
      console.error('Error saving debt:', error);
    }
  }

  function resetForm() {
    setFormData({
      debt_name: '',
      debt_type: 'personal_loan',
      original_amount: '',
      current_balance: '',
      interest_rate: '',
      payment_amount: '',
      payment_frequency: 'monthly',
      next_payment_date: '',
      payoff_target_date: '',
      priority: 0,
      emotional_note: '',
      notes: '',
      currency: 'USD',
      is_active: true
    });
    setEditingId(null);
    setShowForm(false);
  }

  function handleEdit(debt: Debt) {
    setFormData({
      debt_name: debt.debt_name,
      debt_type: debt.debt_type,
      original_amount: debt.original_amount?.toString() || '',
      current_balance: debt.current_balance.toString(),
      interest_rate: debt.interest_rate?.toString() || '',
      payment_amount: debt.payment_amount?.toString() || '',
      payment_frequency: debt.payment_frequency || 'monthly',
      next_payment_date: debt.next_payment_date || '',
      payoff_target_date: debt.payoff_target_date || '',
      priority: debt.priority,
      emotional_note: debt.emotional_note || '',
      notes: debt.notes || '',
      currency: debt.currency,
      is_active: debt.is_active
    });
    setEditingId(debt.id);
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this debt record?')) return;
    try {
      await deleteDebt(id);
      await loadDebts();
    } catch (error) {
      console.error('Error deleting debt:', error);
    }
  }

  const totalDebt = debts.reduce((sum, d) => sum + d.current_balance, 0);
  const totalMonthlyPayments = debts
    .filter(d => d.payment_frequency === 'monthly' && d.payment_amount)
    .reduce((sum, d) => sum + (d.payment_amount || 0), 0);

  const debtTypeLabels: Record<Debt['debt_type'], string> = {
    mortgage: 'Mortgage',
    student_loan: 'Student Loan',
    car_loan: 'Car Loan',
    personal_loan: 'Personal Loan',
    credit_card: 'Credit Card',
    other: 'Other'
  };

  if (loading) {
    return (
      <PlannerShell>
        <div className="max-w-5xl mx-auto p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-1/3"></div>
            <div className="h-32 bg-slate-200 rounded-xl"></div>
          </div>
        </div>
      </PlannerShell>
    );
  }

  return (
    <PlannerShell>
      <div className="max-w-5xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Debts & Commitments</h1>
          <p className="text-slate-600">Manage obligations with clarity, not stress</p>
        </div>

        {/* Summary */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 mb-8 border border-amber-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-700 font-medium mb-1">Total Debt Balance</p>
              <p className="text-3xl font-bold text-slate-900">${totalDebt.toLocaleString()}</p>
              <p className="text-sm text-slate-600 mt-2">
                ${totalMonthlyPayments.toLocaleString()}/month in payments
              </p>
            </div>
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
              <CreditCard className="w-8 h-8 text-amber-600" />
            </div>
          </div>
        </div>

        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="mb-6 px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-2 font-medium shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Add Debt Record
          </button>
        )}

        {showForm && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              {editingId ? 'Edit Debt Record' : 'New Debt Record'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Debt Name</label>
                  <input
                    type="text"
                    required
                    value={formData.debt_name}
                    onChange={e => setFormData({ ...formData, debt_name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="e.g., Car Payment, Student Loan"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select
                    value={formData.debt_type}
                    onChange={e => setFormData({ ...formData, debt_type: e.target.value as Debt['debt_type'] })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    {Object.entries(debtTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Current Balance</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.current_balance}
                    onChange={e => setFormData({ ...formData, current_balance: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Original Amount (Optional)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.original_amount}
                    onChange={e => setFormData({ ...formData, original_amount: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Interest Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.interest_rate}
                    onChange={e => setFormData({ ...formData, interest_rate: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.payment_amount}
                    onChange={e => setFormData({ ...formData, payment_amount: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Next Payment Date</label>
                  <input
                    type="date"
                    value={formData.next_payment_date}
                    onChange={e => setFormData({ ...formData, next_payment_date: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payoff Target Date</label>
                  <input
                    type="date"
                    value={formData.payoff_target_date}
                    onChange={e => setFormData({ ...formData, payoff_target_date: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">How does this feel?</label>
                <input
                  type="text"
                  value={formData.emotional_note}
                  onChange={e => setFormData({ ...formData, emotional_note: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="e.g., Manageable, Stressful, Almost done..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  rows={2}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
                >
                  {editingId ? 'Update' : 'Save'} Debt
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-4">
          {debts.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No debts recorded</h3>
              <p className="text-slate-600 mb-4">Track obligations to manage them with clarity</p>
            </div>
          ) : (
            debts.map(debt => (
              <div
                key={debt.id}
                className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:border-amber-200 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-800">{debt.debt_name}</h3>
                      <span className="px-2 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-full">
                        {debtTypeLabels[debt.debt_type]}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-sm mb-3">
                      <div className="font-semibold text-slate-900">
                        Balance: ${debt.current_balance.toLocaleString()}
                      </div>
                      {debt.payment_amount && (
                        <div className="text-slate-600">
                          Payment: ${debt.payment_amount.toLocaleString()}
                        </div>
                      )}
                      {debt.interest_rate && (
                        <div className="text-slate-600">
                          APR: {debt.interest_rate}%
                        </div>
                      )}
                    </div>
                    {debt.emotional_note && (
                      <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                        <AlertCircle className="w-4 h-4" />
                        <span className="italic">{debt.emotional_note}</span>
                      </div>
                    )}
                    {debt.next_payment_date && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar className="w-4 h-4" />
                        Next payment: {new Date(debt.next_payment_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(debt)}
                      className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(debt.id)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </PlannerShell>
  );
}
