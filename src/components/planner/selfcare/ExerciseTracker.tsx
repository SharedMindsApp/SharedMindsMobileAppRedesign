import { PlannerShell } from '../PlannerShell';
import { useState, useEffect } from 'react';
import { Activity, Plus, Trash2, ArrowLeft, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as selfCareService from '../../../lib/selfCareService';
import type { ExerciseEntry } from '../../../lib/selfCareService';

export function ExerciseTracker() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<ExerciseEntry[]>([]);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    activity_type: '',
    duration_minutes: '',
    intensity: '' as 'low' | 'medium' | 'high' | '',
    notes: '',
    entry_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const spaceId = await selfCareService.getPersonalSpaceId();
      setHouseholdId(spaceId);
      if (spaceId) {
        const data = await selfCareService.getExerciseEntries(spaceId);
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
      await selfCareService.createExerciseEntry({
        household_id: householdId,
        activity_type: formData.activity_type,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : undefined,
        intensity: formData.intensity || undefined,
        notes: formData.notes || undefined,
        entry_date: formData.entry_date,
      });
      setFormData({
        activity_type: '',
        duration_minutes: '',
        intensity: '',
        notes: '',
        entry_date: new Date().toISOString().split('T')[0],
      });
      setShowForm(false);
      await loadData();
    } catch (error) {
      console.error('Error saving entry:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    try {
      await selfCareService.deleteExerciseEntry(id);
      await loadData();
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  const getIntensityColor = (intensity?: string) => {
    switch (intensity) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
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
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
                <Activity className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-800">Exercise Tracker</h1>
                <p className="text-slate-600">Support movement without obsession</p>
              </div>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Log Activity
            </button>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
            <p className="text-sm text-amber-800">
              Track movement that feels good. No calories, no competition.
            </p>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 border border-slate-200 mb-6 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-4">Log Activity</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Activity Type</label>
                  <input
                    type="text"
                    value={formData.activity_type}
                    onChange={(e) => setFormData({ ...formData, activity_type: e.target.value })}
                    placeholder="e.g., Walk, Yoga, Gym..."
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.entry_date}
                    onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                    placeholder="Optional"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Intensity</label>
                  <select
                    value={formData.intensity}
                    onChange={(e) => setFormData({ ...formData, intensity: e.target.value as any })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                  >
                    <option value="">Not specified</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="How did it feel?"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 resize-none"
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
                  className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Log Activity
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {entries.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
              <Activity className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No activities logged yet</h3>
              <p className="text-slate-600 mb-4">Start tracking movement that feels good</p>
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Log Your First Activity
              </button>
            </div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="bg-white rounded-lg p-5 border border-slate-200 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-800">{entry.activity_type}</h3>
                      {entry.intensity && (
                        <span className={`px-2 py-0.5 text-xs rounded-full border ${getIntensityColor(entry.intensity)}`}>
                          {entry.intensity}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(entry.entry_date).toLocaleDateString()}</span>
                      </div>
                      {entry.duration_minutes && (
                        <span>{entry.duration_minutes} minutes</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {entry.notes && (
                  <p className="text-sm text-slate-600 mt-3 bg-slate-50 rounded-lg p-3">{entry.notes}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </PlannerShell>
  );
}
