import { useEffect, useState } from 'react';
import { Plus, Calendar, Edit2, Trash2, BookOpen } from 'lucide-react';
import { PlannerShell } from '../PlannerShell';
import {
  getFinancialReflections,
  createFinancialReflection,
  updateFinancialReflection,
  deleteFinancialReflection,
  type FinancialReflection
} from '../../../lib/financeService';

export function FinancialReflection() {
  const [reflections, setReflections] = useState<FinancialReflection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    reflection_date: new Date().toISOString().split('T')[0],
    reflection_type: 'monthly' as FinancialReflection['reflection_type'],
    title: '',
    what_went_well: '',
    what_was_hard: '',
    emotional_check_in: '',
    key_insights: '',
    decisions_made: '',
    goals_for_next_period: ''
  });

  useEffect(() => {
    loadReflections();
  }, []);

  async function loadReflections() {
    try {
      const data = await getFinancialReflections();
      setReflections(data);
    } catch (error) {
      console.error('Error loading reflections:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingId) {
        await updateFinancialReflection(editingId, formData);
      } else {
        await createFinancialReflection(formData);
      }
      await loadReflections();
      resetForm();
    } catch (error) {
      console.error('Error saving reflection:', error);
    }
  }

  function resetForm() {
    setFormData({
      reflection_date: new Date().toISOString().split('T')[0],
      reflection_type: 'monthly',
      title: '',
      what_went_well: '',
      what_was_hard: '',
      emotional_check_in: '',
      key_insights: '',
      decisions_made: '',
      goals_for_next_period: ''
    });
    setEditingId(null);
    setShowForm(false);
  }

  function handleEdit(reflection: FinancialReflection) {
    setFormData({
      reflection_date: reflection.reflection_date,
      reflection_type: reflection.reflection_type,
      title: reflection.title || '',
      what_went_well: reflection.what_went_well || '',
      what_was_hard: reflection.what_was_hard || '',
      emotional_check_in: reflection.emotional_check_in || '',
      key_insights: reflection.key_insights || '',
      decisions_made: reflection.decisions_made || '',
      goals_for_next_period: reflection.goals_for_next_period || ''
    });
    setEditingId(reflection.id);
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this reflection?')) return;
    try {
      await deleteFinancialReflection(id);
      await loadReflections();
    } catch (error) {
      console.error('Error deleting reflection:', error);
    }
  }

  if (loading) {
    return (
      <PlannerShell>
        <div className="max-w-4xl mx-auto p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-1/3"></div>
            <div className="h-48 bg-slate-200 rounded-xl"></div>
          </div>
        </div>
      </PlannerShell>
    );
  }

  return (
    <PlannerShell>
      <div className="max-w-4xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Financial Reflection</h1>
          <p className="text-slate-600">Understand your relationship with money</p>
        </div>

        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="mb-6 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 font-medium shadow-sm"
          >
            <Plus className="w-5 h-5" />
            New Reflection
          </button>
        )}

        {showForm && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              {editingId ? 'Edit Reflection' : 'New Reflection'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={formData.reflection_date}
                    onChange={e => setFormData({ ...formData, reflection_date: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select
                    value={formData.reflection_type}
                    onChange={e => setFormData({ ...formData, reflection_type: e.target.value as FinancialReflection['reflection_type'] })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                    <option value="ad_hoc">Ad Hoc</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title (Optional)</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="e.g., December 2024 Review"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">What went well?</label>
                <textarea
                  value={formData.what_went_well}
                  onChange={e => setFormData({ ...formData, what_went_well: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  rows={3}
                  placeholder="Wins, progress, positive moments..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">What was hard?</label>
                <textarea
                  value={formData.what_was_hard}
                  onChange={e => setFormData({ ...formData, what_was_hard: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  rows={3}
                  placeholder="Challenges, struggles, setbacks..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Emotional check-in</label>
                <textarea
                  value={formData.emotional_check_in}
                  onChange={e => setFormData({ ...formData, emotional_check_in: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  rows={2}
                  placeholder="How do you feel about money right now?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Key insights</label>
                <textarea
                  value={formData.key_insights}
                  onChange={e => setFormData({ ...formData, key_insights: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  rows={3}
                  placeholder="What did you learn?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Decisions made</label>
                <textarea
                  value={formData.decisions_made}
                  onChange={e => setFormData({ ...formData, decisions_made: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  rows={2}
                  placeholder="What will you change or commit to?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Goals for next period</label>
                <textarea
                  value={formData.goals_for_next_period}
                  onChange={e => setFormData({ ...formData, goals_for_next_period: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  rows={3}
                  placeholder="What are you working towards?"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                >
                  {editingId ? 'Update' : 'Save'} Reflection
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
          {reflections.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No reflections yet</h3>
              <p className="text-slate-600 mb-4">Start your financial reflection practice</p>
            </div>
          ) : (
            reflections.map(reflection => (
              <div
                key={reflection.id}
                className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:border-emerald-200 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {reflection.title && (
                        <h3 className="text-lg font-semibold text-slate-800">{reflection.title}</h3>
                      )}
                      <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full capitalize">
                        {reflection.reflection_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
                      <Calendar className="w-4 h-4" />
                      {new Date(reflection.reflection_date).toLocaleDateString()}
                    </div>

                    {reflection.emotional_check_in && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Emotional Check-in</p>
                        <p className="text-sm text-slate-700 italic">{reflection.emotional_check_in}</p>
                      </div>
                    )}

                    {reflection.what_went_well && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-emerald-600 uppercase mb-1">What Went Well</p>
                        <p className="text-sm text-slate-700">{reflection.what_went_well}</p>
                      </div>
                    )}

                    {reflection.what_was_hard && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-amber-600 uppercase mb-1">What Was Hard</p>
                        <p className="text-sm text-slate-700">{reflection.what_was_hard}</p>
                      </div>
                    )}

                    {reflection.key_insights && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-blue-600 uppercase mb-1">Key Insights</p>
                        <p className="text-sm text-slate-700">{reflection.key_insights}</p>
                      </div>
                    )}

                    {reflection.goals_for_next_period && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Goals for Next Period</p>
                        <p className="text-sm text-slate-700">{reflection.goals_for_next_period}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(reflection)}
                      className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(reflection.id)}
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
