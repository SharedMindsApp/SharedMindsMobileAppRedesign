import { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen, Plus, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PlannerShell } from '../PlannerShell';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

interface LessonPlan {
  id: string;
  title: string;
  subject: string;
  date: string;
  objectives: string;
  materials?: string;
  notes?: string;
  created_at: string;
}

export function LessonPlanning() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plans, setPlans] = useState<LessonPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newPlan, setNewPlan] = useState({
    title: '',
    subject: '',
    date: '',
    objectives: '',
    materials: '',
    notes: ''
  });

  useEffect(() => {
    if (user) {
      loadPlans();
    }
  }, [user]);

  const loadPlans = async () => {
    if (!user) return;
    setLoading(true);
    // Lesson plans are managed separately
    setPlans([]);
    setLoading(false);
  };

  const addPlan = async () => {
    if (!user || !newPlan.title.trim()) return;

    const { error } = await supabase
      .from('daily_planner_entries')
      .insert({
        user_id: user.id,
        life_area: 'education',
        title: newPlan.title,
        content: newPlan.notes,
        tags: 'lesson',
        metadata: {
          subject: newPlan.subject,
          date: newPlan.date,
          objectives: newPlan.objectives,
          materials: newPlan.materials || null
        }
      });

    if (!error) {
      setNewPlan({ title: '', subject: '', date: '', objectives: '', materials: '', notes: '' });
      setShowForm(false);
      loadPlans();
    }
  };

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
              <h1 className="text-3xl font-bold text-slate-800">Lesson Planning</h1>
              <p className="text-slate-600 mt-1">Organize teaching plans and lesson objectives</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              Add Lesson
            </button>
          </div>

          {showForm && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">New Lesson Plan</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Lesson Title</label>
                    <input
                      type="text"
                      value={newPlan.title}
                      onChange={(e) => setNewPlan({ ...newPlan, title: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      placeholder="e.g., Introduction to Fractions"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Subject</label>
                    <input
                      type="text"
                      value={newPlan.subject}
                      onChange={(e) => setNewPlan({ ...newPlan, subject: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      placeholder="e.g., Mathematics"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={newPlan.date}
                    onChange={(e) => setNewPlan({ ...newPlan, date: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Learning Objectives</label>
                  <textarea
                    value={newPlan.objectives}
                    onChange={(e) => setNewPlan({ ...newPlan, objectives: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    rows={2}
                    placeholder="What should students learn from this lesson?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Materials Needed</label>
                  <input
                    type="text"
                    value={newPlan.materials}
                    onChange={(e) => setNewPlan({ ...newPlan, materials: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    placeholder="Textbooks, worksheets, supplies..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Additional Notes</label>
                  <textarea
                    value={newPlan.notes}
                    onChange={(e) => setNewPlan({ ...newPlan, notes: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    rows={3}
                    placeholder="Teaching notes, activities, reminders..."
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={addPlan}
                    className="px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
                  >
                    Save Lesson
                  </button>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setNewPlan({ title: '', subject: '', date: '', objectives: '', materials: '', notes: '' });
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
          <div className="text-center py-12 text-slate-600">Loading lesson plans...</div>
        ) : plans.length === 0 ? (
          <div className="bg-slate-50 rounded-xl p-12 text-center border border-slate-200">
            <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No lesson plans yet</h3>
            <p className="text-slate-600">Start organizing your teaching plans</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-800">{plan.title}</h3>
                      {plan.subject && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded bg-pink-100 text-pink-700 border border-pink-200">
                          {plan.subject}
                        </span>
                      )}
                    </div>
                    {plan.objectives && (
                      <div className="mb-2">
                        <span className="text-xs font-medium text-slate-600">Objectives: </span>
                        <span className="text-sm text-slate-600">{plan.objectives}</span>
                      </div>
                    )}
                    {plan.materials && (
                      <div className="mb-2">
                        <span className="text-xs font-medium text-slate-600">Materials: </span>
                        <span className="text-sm text-slate-600">{plan.materials}</span>
                      </div>
                    )}
                    {plan.notes && (
                      <p className="text-sm text-slate-600 leading-relaxed mt-2">{plan.notes}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-500 mt-4">
                  {plan.date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(plan.date).toLocaleDateString()}
                    </span>
                  )}
                  <span>Created {new Date(plan.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PlannerShell>
  );
}
