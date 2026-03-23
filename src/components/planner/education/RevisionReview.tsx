import { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, Plus, CheckCircle2, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PlannerShell } from '../PlannerShell';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

interface RevisionTopic {
  id: string;
  topic: string;
  subject: string;
  confidence: number;
  last_reviewed?: string;
  notes?: string;
  created_at: string;
}

export function RevisionReview() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [topics, setTopics] = useState<RevisionTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newTopic, setNewTopic] = useState({
    topic: '',
    subject: '',
    confidence: 3,
    notes: ''
  });

  useEffect(() => {
    if (user) {
      loadTopics();
    }
  }, [user]);

  const loadTopics = async () => {
    if (!user) return;
    setLoading(true);
    // Revision topics are managed separately
    setTopics([]);
    setLoading(false);
  };

  const addTopic = async () => {
    if (!user || !newTopic.topic.trim()) return;
    // Revision topics are managed separately
    setNewTopic({ topic: '', subject: '', notes: '' });
    setShowForm(false);
  };

  const addTopicOld = async () => {
    if (!user || !newTopic.topic.trim()) return;

    const { error} = await supabase
      .from('daily_planner_entries_OLD')
      .insert({
        user_id: user.id,
        life_area: 'education',
        title: newTopic.topic,
        content: newTopic.notes,
        tags: 'revision',
        metadata: {
          subject: newTopic.subject,
          confidence: newTopic.confidence,
          last_reviewed: null
        }
      });

    if (!error) {
      setNewTopic({ topic: '', subject: '', confidence: 3, notes: '' });
      setShowForm(false);
      loadTopics();
    }
  };

  const getConfidenceColor = (level: number) => {
    if (level >= 4) return 'bg-green-100 text-green-700 border-green-200';
    if (level >= 3) return 'bg-blue-100 text-blue-700 border-blue-200';
    return 'bg-amber-100 text-amber-700 border-amber-200';
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
              <h1 className="text-3xl font-bold text-slate-800">Revision & Review</h1>
              <p className="text-slate-600 mt-1">Track topics for exam preparation and review</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              Add Topic
            </button>
          </div>

          {showForm && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">New Revision Topic</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Topic</label>
                    <input
                      type="text"
                      value={newTopic.topic}
                      onChange={(e) => setNewTopic({ ...newTopic, topic: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      placeholder="e.g., Photosynthesis, Quadratic Equations"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Subject</label>
                    <input
                      type="text"
                      value={newTopic.subject}
                      onChange={(e) => setNewTopic({ ...newTopic, subject: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      placeholder="e.g., Biology, Mathematics"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Confidence Level: {newTopic.confidence}/5
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={newTopic.confidence}
                    onChange={(e) => setNewTopic({ ...newTopic, confidence: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-slate-600 mt-1">
                    <span>Need More Practice</span>
                    <span>Comfortable</span>
                    <span>Confident</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                  <textarea
                    value={newTopic.notes}
                    onChange={(e) => setNewTopic({ ...newTopic, notes: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    rows={2}
                    placeholder="Key points to remember, areas to focus on..."
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={addTopic}
                    className="px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
                  >
                    Save Topic
                  </button>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setNewTopic({ topic: '', subject: '', confidence: 3, notes: '' });
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
          <div className="text-center py-12 text-slate-600">Loading topics...</div>
        ) : topics.length === 0 ? (
          <div className="bg-slate-50 rounded-xl p-12 text-center border border-slate-200">
            <RefreshCw className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No revision topics yet</h3>
            <p className="text-slate-600">Start tracking topics for exam preparation</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {topics.map((topic) => (
              <div
                key={topic.id}
                className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-800">{topic.topic}</h3>
                      {topic.subject && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded bg-pink-100 text-pink-700 border border-pink-200">
                          {topic.subject}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getConfidenceColor(topic.confidence)}`}>
                        Confidence: {topic.confidence}/5
                      </span>
                      {topic.last_reviewed && (
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <CheckCircle2 className="w-3 h-3" />
                          Reviewed {new Date(topic.last_reviewed).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {topic.notes && (
                      <p className="text-sm text-slate-600 leading-relaxed mt-2">{topic.notes}</p>
                    )}
                  </div>
                </div>
                <div className="text-sm text-slate-500 mt-4">
                  Added {new Date(topic.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PlannerShell>
  );
}
