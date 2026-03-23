import { PlannerShell } from '../PlannerShell';
import { useState, useEffect } from 'react';
import { CloudOff, Plus, Trash2, ArrowLeft, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as selfCareService from '../../../lib/selfCareService';
import type { RestRecoveryLog } from '../../../lib/selfCareService';

const logTypes = ['rest_block', 'recovery_day', 'burnout_note'] as const;

const logTypeLabels = {
  rest_block: 'Rest Block',
  recovery_day: 'Recovery Day',
  burnout_note: 'Burnout Note',
};

const logTypeColors = {
  rest_block: 'bg-blue-100 text-blue-700 border-blue-200',
  recovery_day: 'bg-green-100 text-green-700 border-green-200',
  burnout_note: 'bg-amber-100 text-amber-700 border-amber-200',
};

export function RestRecovery() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<RestRecoveryLog[]>([]);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    log_date: new Date().toISOString().split('T')[0],
    log_type: '' as typeof logTypes[number] | '',
    duration_minutes: '',
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
        const data = await selfCareService.getRestRecoveryLogs(spaceId);
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
    if (!householdId || !formData.log_type) return;

    try {
      await selfCareService.createRestRecoveryLog({
        household_id: householdId,
        log_date: formData.log_date,
        log_type: formData.log_type,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : undefined,
        notes: formData.notes || undefined,
      });
      setFormData({
        log_date: new Date().toISOString().split('T')[0],
        log_type: '',
        duration_minutes: '',
        notes: '',
      });
      setShowForm(false);
      await loadData();
    } catch (error) {
      console.error('Error saving log:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    try {
      await selfCareService.deleteRestRecoveryLog(id);
      await loadData();
    } catch (error) {
      console.error('Error deleting log:', error);
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
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-100 to-gray-100 flex items-center justify-center">
                <CloudOff className="w-6 h-6 text-slate-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-800">Rest & Recovery</h1>
                <p className="text-slate-600">Normalise rest as intentional</p>
              </div>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Log Rest
            </button>
          </div>

          <div className="bg-slate-100 border border-slate-300 rounded-lg p-4 mt-4">
            <p className="text-sm text-slate-700">
              Rest is productive. Recovery is necessary. Track intentional downtime without guilt.
            </p>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 border border-slate-200 mb-6 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-4">Log Rest</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select
                    value={formData.log_type}
                    onChange={(e) => setFormData({ ...formData, log_type: e.target.value as any })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-200 focus:border-slate-400"
                    required
                  >
                    <option value="">Select type...</option>
                    <option value="rest_block">Rest Block (short break)</option>
                    <option value="recovery_day">Recovery Day (full day off)</option>
                    <option value="burnout_note">Burnout Note (feeling overwhelmed)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.log_date}
                    onChange={(e) => setFormData({ ...formData, log_date: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-200 focus:border-slate-400"
                  />
                </div>
              </div>

              {formData.log_type === 'rest_block' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Duration (minutes, optional)</label>
                  <input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                    placeholder="e.g., 30"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-200 focus:border-slate-400"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={
                    formData.log_type === 'burnout_note'
                      ? 'What are you experiencing? What support do you need?'
                      : 'How did you rest? What did you do?'
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-200 focus:border-slate-400 resize-none"
                  rows={4}
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
                  className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
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
              <CloudOff className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No rest logs yet</h3>
              <p className="text-slate-600 mb-4">Start normalising intentional rest</p>
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                Log Your First Rest
              </button>
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="bg-white rounded-lg p-5 border border-slate-200 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-3 py-1 rounded-full border text-sm font-medium ${logTypeColors[log.log_type]}`}>
                        {logTypeLabels[log.log_type]}
                      </span>
                      {log.duration_minutes && (
                        <span className="text-sm text-slate-500">{log.duration_minutes} minutes</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(log.log_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(log.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {log.notes && (
                  <div className={`rounded-lg p-3 border mt-3 ${
                    log.log_type === 'burnout_note'
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{log.notes}</p>
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
