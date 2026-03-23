import { useEffect, useState } from 'react';
import { Plus, DollarSign, Calendar, Edit2, Trash2 } from 'lucide-react';
import { PlannerShell } from '../PlannerShell';
import {
  getIncomeSources,
  createIncomeSource,
  updateIncomeSource,
  deleteIncomeSource,
  type IncomeSource
} from '../../../lib/financeService';

export function IncomeAndCashFlow() {
  const [sources, setSources] = useState<IncomeSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    source_name: '',
    source_type: 'salary' as IncomeSource['source_type'],
    frequency: 'monthly' as IncomeSource['frequency'],
    expected_amount: '',
    actual_amount: '',
    notes: '',
    currency: 'USD',
    is_active: true
  });

  useEffect(() => {
    loadSources();
  }, []);

  async function loadSources() {
    try {
      const data = await getIncomeSources();
      setSources(data);
    } catch (error) {
      console.error('Error loading income sources:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        expected_amount: formData.expected_amount ? parseFloat(formData.expected_amount) : undefined,
        actual_amount: formData.actual_amount ? parseFloat(formData.actual_amount) : undefined
      };

      if (editingId) {
        await updateIncomeSource(editingId, data);
      } else {
        await createIncomeSource(data);
      }

      await loadSources();
      resetForm();
    } catch (error) {
      console.error('Error saving income source:', error);
    }
  }

  function resetForm() {
    setFormData({
      source_name: '',
      source_type: 'salary',
      frequency: 'monthly',
      expected_amount: '',
      actual_amount: '',
      notes: '',
      currency: 'USD',
      is_active: true
    });
    setEditingId(null);
    setShowForm(false);
  }

  function handleEdit(source: IncomeSource) {
    setFormData({
      source_name: source.source_name,
      source_type: source.source_type,
      frequency: source.frequency,
      expected_amount: source.expected_amount?.toString() || '',
      actual_amount: source.actual_amount?.toString() || '',
      notes: source.notes || '',
      currency: source.currency,
      is_active: source.is_active
    });
    setEditingId(source.id);
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this income source?')) return;
    try {
      await deleteIncomeSource(id);
      await loadSources();
    } catch (error) {
      console.error('Error deleting income source:', error);
    }
  }

  const totalMonthlyIncome = sources
    .filter(s => s.frequency === 'monthly' && s.is_active)
    .reduce((sum, s) => sum + (s.actual_amount || s.expected_amount || 0), 0);

  const sourceTypeLabels: Record<IncomeSource['source_type'], string> = {
    salary: 'Salary',
    freelance: 'Freelance',
    benefits: 'Benefits',
    passive: 'Passive Income',
    business: 'Business',
    investment_income: 'Investment Income',
    other: 'Other'
  };

  const frequencyLabels: Record<IncomeSource['frequency'], string> = {
    weekly: 'Weekly',
    biweekly: 'Bi-weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    annual: 'Annual',
    irregular: 'Irregular'
  };

  if (loading) {
    return (
      <PlannerShell>
        <div className="max-w-5xl mx-auto p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-1/3"></div>
            <div className="h-32 bg-slate-200 rounded-xl"></div>
            <div className="h-48 bg-slate-200 rounded-xl"></div>
          </div>
        </div>
      </PlannerShell>
    );
  }

  return (
    <PlannerShell>
      <div className="max-w-5xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Income & Cash Flow</h1>
          <p className="text-slate-600">Track where your money comes from</p>
        </div>

        {/* Summary Card */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 mb-8 border border-emerald-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-emerald-700 font-medium mb-1">Estimated Monthly Income</p>
              <p className="text-3xl font-bold text-slate-900">${totalMonthlyIncome.toLocaleString()}</p>
              <p className="text-sm text-slate-600 mt-2">{sources.filter(s => s.is_active).length} active sources</p>
            </div>
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <DollarSign className="w-8 h-8 text-emerald-600" />
            </div>
          </div>
        </div>

        {/* Add Button */}
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="mb-6 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 font-medium shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Add Income Source
          </button>
        )}

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              {editingId ? 'Edit Income Source' : 'New Income Source'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Source Name</label>
                  <input
                    type="text"
                    required
                    value={formData.source_name}
                    onChange={e => setFormData({ ...formData, source_name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="e.g., Primary Job, Freelance Client"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select
                    value={formData.source_type}
                    onChange={e => setFormData({ ...formData, source_type: e.target.value as IncomeSource['source_type'] })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    {Object.entries(sourceTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Frequency</label>
                  <select
                    value={formData.frequency}
                    onChange={e => setFormData({ ...formData, frequency: e.target.value as IncomeSource['frequency'] })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    {Object.entries(frequencyLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Expected Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.expected_amount}
                    onChange={e => setFormData({ ...formData, expected_amount: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Actual Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.actual_amount}
                    onChange={e => setFormData({ ...formData, actual_amount: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  rows={2}
                  placeholder="Any additional context..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                >
                  {editingId ? 'Update' : 'Save'} Income Source
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

        {/* Income Sources List */}
        <div className="space-y-4">
          {sources.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No income sources yet</h3>
              <p className="text-slate-600 mb-4">Start by adding your first income source</p>
            </div>
          ) : (
            sources.map(source => (
              <div
                key={source.id}
                className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:border-emerald-200 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-800">{source.source_name}</h3>
                      <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">
                        {sourceTypeLabels[source.source_type]}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-slate-600 mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {frequencyLabels[source.frequency]}
                      </div>
                      {source.expected_amount && (
                        <div>Expected: ${source.expected_amount.toLocaleString()}</div>
                      )}
                      {source.actual_amount && (
                        <div className="font-medium text-emerald-700">
                          Actual: ${source.actual_amount.toLocaleString()}
                        </div>
                      )}
                    </div>
                    {source.notes && (
                      <p className="text-sm text-slate-600 italic">{source.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(source)}
                      className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(source.id)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete"
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
