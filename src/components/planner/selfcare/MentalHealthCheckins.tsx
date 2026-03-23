import { PlannerShell } from '../PlannerShell';
import { useState, useEffect } from 'react';
import { Brain, Plus, Trash2, ArrowLeft, Lock, Calendar, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as selfCareService from '../../../lib/selfCareService';
import type { MentalHealthCheckin } from '../../../lib/selfCareService';

const moodOptions = [
  { value: 'peaceful', label: 'Peaceful', emoji: '😌' },
  { value: 'happy', label: 'Happy', emoji: '😊' },
  { value: 'content', label: 'Content', emoji: '🙂' },
  { value: 'neutral', label: 'Neutral', emoji: '😐' },
  { value: 'anxious', label: 'Anxious', emoji: '😰' },
  { value: 'sad', label: 'Sad', emoji: '😢' },
  { value: 'overwhelmed', label: 'Overwhelmed', emoji: '😫' },
  { value: 'tired', label: 'Tired', emoji: '😴' },
];

export function MentalHealthCheckins() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [checkins, setCheckins] = useState<MentalHealthCheckin[]>([]);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    mood: '',
    energy_level: 3,
    stress_level: 3,
    reflection: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const spaceId = await selfCareService.getPersonalSpaceId();
      setHouseholdId(spaceId);
      if (spaceId) {
        const data = await selfCareService.getMentalHealthCheckins(spaceId);
        setCheckins(data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!householdId || !formData.mood) return;

    try {
      await selfCareService.createMentalHealthCheckin({
        household_id: householdId,
        mood: formData.mood,
        energy_level: formData.energy_level,
        stress_level: formData.stress_level,
        reflection: formData.reflection || undefined,
      });
      setFormData({
        mood: '',
        energy_level: 3,
        stress_level: 3,
        reflection: '',
      });
      setShowForm(false);
      await loadData();
    } catch (error) {
      console.error('Error saving check-in:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this check-in? This cannot be undone.')) return;
    try {
      await selfCareService.deleteMentalHealthCheckin(id);
      await loadData();
    } catch (error) {
      console.error('Error deleting check-in:', error);
    }
  };

  const getMoodEmoji = (mood: string) => {
    const option = moodOptions.find(o => o.value === mood);
    return option?.emoji || '🙂';
  };

  const getMoodLabel = (mood: string) => {
    const option = moodOptions.find(o => o.value === mood);
    return option?.label || mood;
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
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
                <Brain className="w-6 h-6 text-violet-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-800">Mental Health Check-Ins</h1>
                <p className="text-slate-600">Emotional awareness, not diagnosis</p>
              </div>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Check In
            </button>
          </div>

          <div className="bg-violet-50 border border-violet-200 rounded-lg p-4 mt-4 flex items-start gap-3">
            <Lock className="w-5 h-5 text-violet-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-violet-800">
              <p className="font-semibold mb-1">Completely Private</p>
              <p>These check-ins are never shared. They exist only for your self-awareness.</p>
            </div>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 border border-slate-200 mb-6 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-4">How are you feeling?</h3>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">Current Mood</label>
                <div className="grid grid-cols-4 gap-2">
                  {moodOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, mood: option.value })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        formData.mood === option.value
                          ? 'border-violet-500 bg-violet-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">{option.emoji}</div>
                      <div className="text-xs font-medium text-slate-700">{option.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Energy Level: {formData.energy_level}/5
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={formData.energy_level}
                  onChange={(e) => setFormData({ ...formData, energy_level: parseInt(e.target.value) })}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>Drained</span>
                  <span>Energized</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Stress Level: {formData.stress_level}/5
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={formData.stress_level}
                  onChange={(e) => setFormData({ ...formData, stress_level: parseInt(e.target.value) })}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>Calm</span>
                  <span>Overwhelmed</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reflection (optional)</label>
                <textarea
                  value={formData.reflection}
                  onChange={(e) => setFormData({ ...formData, reflection: e.target.value })}
                  placeholder="What's on your mind?"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-200 focus:border-violet-400 resize-none"
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
                  disabled={!formData.mood}
                  className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Save Check-In
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {checkins.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
              <Brain className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No check-ins yet</h3>
              <p className="text-slate-600 mb-4">Start building self-awareness by checking in with yourself</p>
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
              >
                Your First Check-In
              </button>
            </div>
          ) : (
            checkins.map((checkin) => (
              <div key={checkin.id} className="bg-white rounded-lg p-5 border border-slate-200 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{getMoodEmoji(checkin.mood)}</div>
                    <div>
                      <h3 className="font-semibold text-slate-800">{getMoodLabel(checkin.mood)}</h3>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(checkin.checkin_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{checkin.checkin_time}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(checkin.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-xs text-slate-500 mb-1">Energy</div>
                    <div className="font-semibold text-slate-700">{checkin.energy_level}/5</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-xs text-slate-500 mb-1">Stress</div>
                    <div className="font-semibold text-slate-700">{checkin.stress_level}/5</div>
                  </div>
                </div>

                {checkin.reflection && (
                  <div className="bg-violet-50 rounded-lg p-4 border border-violet-100">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{checkin.reflection}</p>
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
