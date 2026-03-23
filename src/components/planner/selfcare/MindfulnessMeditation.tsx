import { PlannerShell } from '../PlannerShell';
import { useState, useEffect } from 'react';
import { Sparkles, Plus, Trash2, ArrowLeft, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as selfCareService from '../../../lib/selfCareService';
import type { MindfulnessSession } from '../../../lib/selfCareService';

const sessionTypes = [
  'Breathing Exercise',
  'Meditation',
  'Body Scan',
  'Grounding Exercise',
  'Mindful Walk',
  'Visualization',
  'Other',
];

export function MindfulnessMeditation() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<MindfulnessSession[]>([]);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    session_type: '',
    duration_minutes: '',
    reflection: '',
    session_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const spaceId = await selfCareService.getPersonalSpaceId();
      setHouseholdId(spaceId);
      if (spaceId) {
        const data = await selfCareService.getMindfulnessSessions(spaceId);
        setSessions(data);
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
      await selfCareService.createMindfulnessSession({
        household_id: householdId,
        session_type: formData.session_type,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : undefined,
        reflection: formData.reflection || undefined,
        session_date: formData.session_date,
      });
      setFormData({
        session_type: '',
        duration_minutes: '',
        reflection: '',
        session_date: new Date().toISOString().split('T')[0],
      });
      setShowForm(false);
      await loadData();
    } catch (error) {
      console.error('Error saving session:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this session?')) return;
    try {
      await selfCareService.deleteMindfulnessSession(id);
      await loadData();
    } catch (error) {
      console.error('Error deleting session:', error);
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
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-100 to-cyan-100 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-800">Mindfulness & Meditation</h1>
                <p className="text-slate-600">Presence, not performance</p>
              </div>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Log Session
            </button>
          </div>

          <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 mt-4">
            <p className="text-sm text-teal-800">
              Track moments of presence. No timer required, no streak pressure.
            </p>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 border border-slate-200 mb-6 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-4">Log Session</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Session Type</label>
                  <select
                    value={formData.session_type}
                    onChange={(e) => setFormData({ ...formData, session_type: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-200 focus:border-teal-400"
                    required
                  >
                    <option value="">Select type...</option>
                    {sessionTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.session_date}
                    onChange={(e) => setFormData({ ...formData, session_date: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-200 focus:border-teal-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Duration (minutes, optional)</label>
                <input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                  placeholder="Optional"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-200 focus:border-teal-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reflection (optional)</label>
                <textarea
                  value={formData.reflection}
                  onChange={(e) => setFormData({ ...formData, reflection: e.target.value })}
                  placeholder="How did it feel? What did you notice?"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-200 focus:border-teal-400 resize-none"
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
                  className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                  Save Session
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {sessions.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
              <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No sessions logged yet</h3>
              <p className="text-slate-600 mb-4">Start tracking moments of presence and mindfulness</p>
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                Log Your First Session
              </button>
            </div>
          ) : (
            sessions.map((session) => (
              <div key={session.id} className="bg-white rounded-lg p-5 border border-slate-200 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-slate-800">{session.session_type}</h3>
                      {session.duration_minutes && (
                        <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs rounded-full">
                          {session.duration_minutes} min
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(session.session_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(session.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {session.reflection && (
                  <div className="bg-teal-50 rounded-lg p-3 border border-teal-100 mt-3">
                    <p className="text-sm text-slate-700">{session.reflection}</p>
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
