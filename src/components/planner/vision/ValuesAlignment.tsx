import { useEffect, useState } from 'react';
import { Plus, Sparkles, Edit2, Trash2 } from 'lucide-react';
import { PlannerShell } from '../PlannerShell';
import {
  getValues,
  createValue,
  updateValue,
  deleteValue,
  type Value
} from '../../../lib/visionService';

export function ValuesAlignment() {
  const [values, setValues] = useState<Value[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    value_name: '',
    description: '',
    what_it_means_to_me: '',
    current_alignment_feeling: ''
  });

  useEffect(() => {
    loadValues();
  }, []);

  async function loadValues() {
    try {
      const data = await getValues();
      setValues(data);
    } catch (error) {
      console.error('Error loading values:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingId) {
        await updateValue(editingId, formData);
      } else {
        await createValue({ ...formData, priority_order: values.length, is_active: true });
      }
      await loadValues();
      resetForm();
    } catch (error) {
      console.error('Error saving value:', error);
    }
  }

  function resetForm() {
    setFormData({
      value_name: '',
      description: '',
      what_it_means_to_me: '',
      current_alignment_feeling: ''
    });
    setEditingId(null);
    setShowForm(false);
  }

  function handleEdit(value: Value) {
    setFormData({
      value_name: value.value_name,
      description: value.description || '',
      what_it_means_to_me: value.what_it_means_to_me || '',
      current_alignment_feeling: value.current_alignment_feeling || ''
    });
    setEditingId(value.id);
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this value?')) return;
    try {
      await deleteValue(id);
      await loadValues();
    } catch (error) {
      console.error('Error deleting value:', error);
    }
  }

  if (loading) {
    return (
      <PlannerShell>
        <div className="max-w-5xl mx-auto p-8">
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
      <div className="max-w-5xl mx-auto p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-slate-700" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800">Values Alignment</h1>
          </div>
          <p className="text-slate-600">Core values and how your life reflects them</p>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-200">
          <p className="text-sm text-slate-700">
            This isn't a scoring system. It's about noticing what matters to you and whether your current life reflects that. Referenced by Guardrails (read-only).
          </p>
        </div>

        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="mb-6 px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2 font-medium shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Add Core Value
          </button>
        )}

        {showForm && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              {editingId ? 'Edit Value' : 'New Core Value'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Value Name</label>
                <input
                  type="text"
                  required
                  value={formData.value_name}
                  onChange={e => setFormData({ ...formData, value_name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                  placeholder="e.g., Authenticity, Growth, Connection"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                  placeholder="A brief definition..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">What This Means to Me</label>
                <textarea
                  value={formData.what_it_means_to_me}
                  onChange={e => setFormData({ ...formData, what_it_means_to_me: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                  rows={3}
                  placeholder="Your personal definition of this value..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Current Alignment Feeling</label>
                <textarea
                  value={formData.current_alignment_feeling}
                  onChange={e => setFormData({ ...formData, current_alignment_feeling: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                  rows={2}
                  placeholder="Does your current life reflect this? How does it feel?"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
                >
                  {editingId ? 'Update' : 'Save'} Value
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
          {values.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No values defined yet</h3>
              <p className="text-slate-600 mb-4">Start by identifying what truly matters to you</p>
            </div>
          ) : (
            values.map(value => (
              <div
                key={value.id}
                className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-800">{value.value_name}</h3>
                      {value.description && (
                        <span className="text-sm text-slate-500">- {value.description}</span>
                      )}
                    </div>
                    {value.what_it_means_to_me && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">What This Means to Me</p>
                        <p className="text-sm text-slate-700 leading-relaxed">{value.what_it_means_to_me}</p>
                      </div>
                    )}
                    {value.current_alignment_feeling && (
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Current Alignment</p>
                        <p className="text-sm text-slate-700 italic">{value.current_alignment_feeling}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(value)}
                      className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(value.id)}
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
