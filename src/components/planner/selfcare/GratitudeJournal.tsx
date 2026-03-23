import { PlannerShell } from '../PlannerShell';
import { useState, useEffect } from 'react';
import { BookHeart, Plus, Trash2, Edit2, ArrowLeft, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as selfCareService from '../../../lib/selfCareService';
import type { GratitudeEntry } from '../../../lib/selfCareService';

export function GratitudeJournal() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<GratitudeEntry[]>([]);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    content: '',
    format: 'free_write' as 'free_write' | 'bullets',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const spaceId = await selfCareService.getPersonalSpaceId();
      setHouseholdId(spaceId);
      if (spaceId) {
        const data = await selfCareService.getGratitudeEntries(spaceId);
        setEntries(data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!householdId) return;

    try {
      if (editingId) {
        await selfCareService.updateGratitudeEntry(editingId, formData);
      } else {
        await selfCareService.createGratitudeEntry({
          ...formData,
          household_id: householdId,
        });
      }
      resetForm();
      await loadData();
    } catch (error) {
      console.error('Error saving entry:', error);
    }
  };

  const handleEdit = (entry: GratitudeEntry) => {
    setEditingId(entry.id);
    setFormData({
      entry_date: entry.entry_date,
      content: entry.content,
      format: entry.format,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    try {
      await selfCareService.deleteGratitudeEntry(id);
      await loadData();
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      entry_date: new Date().toISOString().split('T')[0],
      content: '',
      format: 'free_write',
    });
    setShowForm(false);
    setEditingId(null);
  };

  if (loading) {
    return (
      <PlannerShell>
        <div className="max-w-4xl mx-auto p-8">
          <p className="text-slate-600">Loading...</p>
        </div>
      </PlannerShell>
    );
  }

  return (
    <PlannerShell>
      <div className="max-w-4xl mx-auto p-8">
        <button
          onClick={() => navigate('/planner/selfcare')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Self-Care</span>
        </button>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-100 to-yellow-100 flex items-center justify-center">
                <BookHeart className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-800">Gratitude Journal</h1>
                <p className="text-slate-600">Cultivate positive awareness</p>
              </div>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Entry
            </button>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
            <p className="text-sm text-amber-800">
              Reflect on what you're grateful for. No forced daily use, just when it feels right.
            </p>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 border border-slate-200 mb-6 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-4">
              {editingId ? 'Edit Entry' : 'New Gratitude Entry'}
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.entry_date}
                    onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-200 focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Format</label>
                  <select
                    value={formData.format}
                    onChange={(e) => setFormData({ ...formData, format: e.target.value as any })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-200 focus:border-amber-400"
                  >
                    <option value="free_write">Free Write</option>
                    <option value="bullets">Bullet Points</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  What are you grateful for today?
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder={formData.format === 'bullets' ? '• First thing...\n• Second thing...\n• Third thing...' : 'Write freely about what brings you gratitude...'}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-200 focus:border-amber-400 resize-none font-serif"
                  rows={8}
                  required
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                >
                  {editingId ? 'Update' : 'Save'} Entry
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {entries.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
              <BookHeart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No entries yet</h3>
              <p className="text-slate-600 mb-4">Start your gratitude practice when you're ready</p>
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                Write Your First Entry
              </button>
            </div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="bg-white rounded-lg p-6 border border-slate-200 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(entry.entry_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(entry)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="prose prose-slate max-w-none">
                  <p className="text-slate-700 whitespace-pre-wrap font-serif leading-relaxed">
                    {entry.content}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </PlannerShell>
  );
}
