import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Plus, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PlannerShell } from '../PlannerShell';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

interface StudySession {
  id: string;
  subject: string;
  planned_hours: number;
  actual_hours?: number;
  date: string;
  notes?: string;
}

export function LearningSchedule() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [newSession, setNewSession] = useState({
    subject: '',
    planned_hours: 1,
    actual_hours: 0,
    notes: ''
  });

  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user, selectedDate]);

  const loadSessions = async () => {
    if (!user) return;
    setLoading(true);

    // Study sessions are managed separately in the calendar view
    setSessions([]);
    setLoading(false);
  };

  const addSession = async () => {
    // Study sessions are managed separately in the calendar view
    setNewSession({ subject: '', planned_hours: 1, actual_hours: 0, notes: '' });
    setShowForm(false);
  };

  const totalPlannedHours = sessions.reduce((sum, s) => sum + s.planned_hours, 0);
  const totalActualHours = sessions.reduce((sum, s) => sum + (s.actual_hours || 0), 0);

  return (
    <PlannerShell>
      <div className="max-w-5xl mx-auto p-8">
        <button
          onClick={() => navigate('/planner/education')}
          className="flex items-center gap-2 px-4 py-2 mb-6 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to Education</span>
        </button>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Learning Schedule</h1>
              <p className="text-slate-600 mt-1">Plan and track your learning time blocks</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              Add Session
            </button>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Select Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-600 mb-1">Planned Hours</div>
                <div className="text-2xl font-bold text-pink-600">{totalPlannedHours}h</div>
              </div>
            </div>
            {totalActualHours > 0 && (
              <div className="mt-4 p-3 bg-pink-50 rounded-lg border border-pink-100">
                <div className="text-sm text-slate-600">Actual Study Time</div>
                <div className="text-xl font-semibold text-pink-700">{totalActualHours}h</div>
              </div>
            )}
          </div>

          {showForm && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">New Learning Session</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Subject</label>
                    <input
                      type="text"
                      value={newSession.subject}
                      onChange={(e) => setNewSession({ ...newSession, subject: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      placeholder="e.g., Mathematics, History"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Planned Hours</label>
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={newSession.planned_hours}
                      onChange={(e) => setNewSession({ ...newSession, planned_hours: parseFloat(e.target.value) })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                  <textarea
                    value={newSession.notes}
                    onChange={(e) => setNewSession({ ...newSession, notes: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    rows={2}
                    placeholder="Topics to study, chapters, etc."
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={addSession}
                    className="px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
                  >
                    Save Session
                  </button>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setNewSession({ subject: '', planned_hours: 1, actual_hours: 0, notes: '' });
                    }}
                    className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-600">Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="bg-slate-50 rounded-xl p-12 text-center border border-slate-200">
            <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No learning sessions planned</h3>
            <p className="text-slate-600">Add your first learning session for {new Date(selectedDate).toLocaleDateString()}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800">
              Learning Sessions - {new Date(selectedDate).toLocaleDateString()}
            </h3>
            {sessions.map((session) => (
              <div
                key={session.id}
                className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <Clock className="w-5 h-5 text-pink-600 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-800 mb-1">{session.subject}</h3>
                      <div className="flex gap-4 text-sm text-slate-600 mb-2">
                        <span>Planned: {session.planned_hours}h</span>
                        {session.actual_hours && session.actual_hours > 0 && (
                          <span className="text-green-600">Actual: {session.actual_hours}h</span>
                        )}
                      </div>
                      {session.notes && (
                        <p className="text-sm text-slate-600 leading-relaxed">{session.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PlannerShell>
  );
}
