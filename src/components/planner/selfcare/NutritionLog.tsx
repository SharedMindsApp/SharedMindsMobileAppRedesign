import { PlannerShell } from '../PlannerShell';
import { useState, useEffect } from 'react';
import { Utensils, Plus, Trash2, ArrowLeft, Calendar, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as selfCareService from '../../../lib/selfCareService';
import { createNutritionLog } from '../../../lib/selfCareServiceOffline';
import type { NutritionLog } from '../../../lib/selfCareService';
import { showToast } from '../../Toast';
import { ConfirmDialogInline } from '../../ConfirmDialogInline';

const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'other'] as const;
const commonTags = ['balanced', 'rushed', 'social', 'comfort', 'healthy', 'homemade', 'takeout'];

export function NutritionLog() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<NutritionLog[]>([]);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    meal_type: '' as typeof mealTypes[number] | '',
    content: '',
    tags: [] as string[],
    mood_note: '',
    entry_date: new Date().toISOString().split('T')[0],
    entry_time: new Date().toTimeString().slice(0, 5),
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const spaceId = await selfCareService.getPersonalSpaceId();
      setHouseholdId(spaceId);
      if (spaceId) {
        const data = await selfCareService.getNutritionLogs(spaceId);
        setLogs(data);
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
      await createNutritionLog({
        household_id: householdId,
        meal_type: formData.meal_type || undefined,
        content: formData.content,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        mood_note: formData.mood_note || undefined,
        entry_date: formData.entry_date,
        entry_time: formData.entry_time || undefined,
      });
      setFormData({
        meal_type: '',
        content: '',
        tags: [],
        mood_note: '',
        entry_date: new Date().toISOString().split('T')[0],
        entry_time: new Date().toTimeString().slice(0, 5),
      });
      setShowForm(false);
      await loadData();
    } catch (error) {
      console.error('Error saving log:', error);
      showToast('error', 'Failed to save nutrition log. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await selfCareService.deleteNutritionLog(deleteConfirmId);
      await loadData();
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Error deleting log:', error);
      showToast('error', 'Failed to delete entry. Please try again.');
      setDeleteConfirmId(null);
    }
  };

  const toggleTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  // Phase 5A: Confirmation dialog
  if (deleteConfirmId) {
    return (
      <PlannerShell>
        <ConfirmDialogInline
          isOpen={true}
          message="Delete this entry?"
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteConfirmId(null)}
        />
      </PlannerShell>
    );
  }

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
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
                <Utensils className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-800">Nutrition Log</h1>
                <p className="text-slate-600">Encourage awareness, not restriction</p>
              </div>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Log Meal
            </button>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mt-4">
            <p className="text-sm text-emerald-800">
              Track what you eat with awareness. No macro counting, no diet scoring.
            </p>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 border border-slate-200 mb-6 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-4">Log Meal</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Meal Type (optional)</label>
                  <select
                    value={formData.meal_type}
                    onChange={(e) => setFormData({ ...formData, meal_type: e.target.value as any })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-200 focus:border-green-400"
                  >
                    <option value="">Not specified</option>
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snack">Snack</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date & Time</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={formData.entry_date}
                      onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-200 focus:border-green-400 text-sm"
                    />
                    <input
                      type="time"
                      value={formData.entry_time}
                      onChange={(e) => setFormData({ ...formData, entry_time: e.target.value })}
                      className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-200 focus:border-green-400 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">What did you eat?</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Describe your meal..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-200 focus:border-green-400 resize-none"
                  rows={3}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tags (optional)</label>
                <div className="flex flex-wrap gap-2">
                  {commonTags.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        formData.tags.includes(tag)
                          ? 'bg-green-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mood/Feelings (optional)</label>
                <textarea
                  value={formData.mood_note}
                  onChange={(e) => setFormData({ ...formData, mood_note: e.target.value })}
                  placeholder="How did you feel during/after?"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-200 focus:border-green-400 resize-none"
                  rows={2}
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Save Entry
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {logs.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
              <Utensils className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No entries yet</h3>
              <p className="text-slate-600 mb-4">Start building awareness around your nutrition</p>
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Log Your First Meal
              </button>
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="bg-white rounded-lg p-5 border border-slate-200 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {log.meal_type && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full capitalize">
                          {log.meal_type}
                        </span>
                      )}
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(log.entry_date).toLocaleDateString()}</span>
                        {log.entry_time && <span>{log.entry_time}</span>}
                      </div>
                    </div>
                    <p className="text-slate-700 mb-2">{log.content}</p>
                    {log.tags && log.tags.length > 0 && (
                      <div className="flex items-center gap-2 mb-2">
                        <Tag className="w-3.5 h-3.5 text-slate-400" />
                        <div className="flex flex-wrap gap-1">
                          {log.tags.map((tag, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(log.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {log.mood_note && (
                  <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                    <p className="text-sm text-slate-700">{log.mood_note}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </PlannerShell>
  );
}
