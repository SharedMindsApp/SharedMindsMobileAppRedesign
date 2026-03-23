import { PlannerShell } from '../PlannerShell';
import { useState, useEffect } from 'react';
import { Moon, Plus, Trash2, ArrowLeft, Calendar, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as selfCareService from '../../../lib/selfCareService';
import type { SleepLog } from '../../../lib/selfCareService';

export function SleepTracker() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<SleepLog[]>([]);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    log_date: new Date().toISOString().split('T')[0],
    duration_hours: '',
    quality_rating: 3,
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const spaceId = await selfCareService.getPersonalSpaceId();
      setHouseholdId(spaceId);
      if (spaceId) {
        const data = await selfCareService.getSleepLogs(spaceId);
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
      await selfCareService.createOrUpdateSleepLog({
        household_id: householdId,
        log_date: formData.log_date,
        duration_hours: formData.duration_hours ? parseFloat(formData.duration_hours) : undefined,
        quality_rating: formData.quality_rating,
        notes: formData.notes || undefined,
      });
      setFormData({
        log_date: new Date().toISOString().split('T')[0],
        duration_hours: '',
        quality_rating: 3,
        notes: '',
      });
      setShowForm(false);
      await loadData();
    } catch (error) {
      console.error('Error saving log:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this sleep log?')) return;
    try {
      await selfCareService.deleteSleepLog(id);
      await loadData();
    } catch (error) {
      console.error('Error deleting log:', error);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`}
      />
    ));
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
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center">
                <Moon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-800">Sleep Tracker</h1>
                <p className="text-slate-600">Track rest gently</p>
              </div>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Log Sleep
            </button>
          </div>

          <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3 mt-4">
            <p className="text-sm text-cyan-800">
              Track your sleep without pressure. No sleep score, no judgment.
            </p>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 border border-slate-200 mb-6 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-4">Log Sleep</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={formData.log_date}
                  onChange={(e) => setFormData({ ...formData, log_date: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Duration (hours, optional)</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.duration_hours}
                  onChange={(e) => setFormData({ ...formData, duration_hours: e.target.value })}
                  placeholder="e.g., 7.5"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Sleep Quality: {formData.quality_rating}/5
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={formData.quality_rating}
                  onChange={(e) => setFormData({ ...formData, quality_rating: parseInt(e.target.value) })}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>Poor</span>
                  <span>Excellent</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Dreams, disturbances, how you felt..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400 resize-none"
                  rows={3}
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
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Log
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {logs.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
              <Moon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No sleep logs yet</h3>
              <p className="text-slate-600 mb-4">Start tracking your rest patterns</p>
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Log Your First Night
              </button>
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="bg-white rounded-lg p-5 border border-slate-200 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="font-medium text-slate-800">
                        {new Date(log.log_date).toLocaleDateString()}
                      </span>
                      {log.duration_hours && (
                        <span className="text-sm text-slate-600">
                          {log.duration_hours} hours
                        </span>
                      )}
                    </div>
                    {log.quality_rating && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-600">Quality:</span>
                        <div className="flex gap-0.5">
                          {renderStars(log.quality_rating)}
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
                {log.notes && (
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100 mt-3">
                    <p className="text-sm text-slate-700">{log.notes}</p>
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
