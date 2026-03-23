import { useState, useEffect } from 'react';
import { ArrowLeft, Mail, Phone, MessageSquare, Plus, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PlannerShell } from '../PlannerShell';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

interface Communication {
  id: string;
  type: 'email' | 'call' | 'message';
  description: string;
  person: string;
  completed: boolean;
  created_at: string;
}

export function Communications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newComm, setNewComm] = useState({
    type: 'email' as const,
    description: '',
    person: ''
  });

  useEffect(() => {
    if (user) {
      loadCommunications();
    }
  }, [user]);

  const loadCommunications = async () => {
    if (!user) return;
    setLoading(true);

    const { data } = await supabase
      .from('daily_planner_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('life_area', 'work')
      .ilike('tags', '%communication%')
      .order('created_at', { ascending: false });

    if (data) {
      setCommunications(data.map(c => {
        const metadata = c.metadata as any || {};
        return {
          id: c.id,
          type: metadata.type || 'email',
          description: c.title || '',
          person: metadata.person || '',
          completed: metadata.completed || false,
          created_at: c.created_at
        };
      }));
    }

    setLoading(false);
  };

  const addCommunication = async () => {
    if (!user || !newComm.description.trim()) return;

    await supabase
      .from('daily_planner_entries')
      .insert({
        user_id: user.id,
        life_area: 'work',
        title: newComm.description,
        tags: 'communication',
        metadata: {
          type: newComm.type,
          person: newComm.person,
          completed: false
        }
      });

    setNewComm({ type: 'email', description: '', person: '' });
    setShowForm(false);
    loadCommunications();
  };

  const pending = communications.filter(c => !c.completed);
  const completed = communications.filter(c => c.completed);

  const getIcon = (type: string) => {
    switch (type) {
      case 'call':
        return Phone;
      case 'message':
        return MessageSquare;
      default:
        return Mail;
    }
  };

  return (
    <PlannerShell>
      <div className="max-w-5xl mx-auto p-8">
        <button
          onClick={() => navigate('/planner/work')}
          className="flex items-center gap-2 px-4 py-2 mb-6 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to Work & Career</span>
        </button>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Communications</h1>
              <p className="text-slate-600 mt-1">Track emails, calls, and follow-ups</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              Add Communication
            </button>
          </div>

          {showForm && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">New Communication</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
                  <select
                    value={newComm.type}
                    onChange={(e) => setNewComm({ ...newComm, type: e.target.value as any })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="email">Email</option>
                    <option value="call">Call</option>
                    <option value="message">Message</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Person / Contact</label>
                  <input
                    type="text"
                    value={newComm.person}
                    onChange={(e) => setNewComm({ ...newComm, person: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Who to contact"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                  <textarea
                    value={newComm.description}
                    onChange={(e) => setNewComm({ ...newComm, description: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    rows={2}
                    placeholder="What to discuss or follow up on..."
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={addCommunication}
                    className="px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setNewComm({ type: 'email', description: '', person: '' });
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
          <div className="text-center py-12 text-slate-600">Loading communications...</div>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-800 mb-4">Pending ({pending.length})</h2>
              {pending.length === 0 ? (
                <div className="bg-slate-50 rounded-xl p-8 text-center border border-slate-200">
                  <Mail className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-600">No pending communications</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {pending.map(comm => {
                    const Icon = getIcon(comm.type);
                    return (
                      <div key={comm.id} className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                        <div className="flex items-start gap-4">
                          <div className="p-2 bg-teal-50 rounded-lg">
                            <Icon className="w-5 h-5 text-teal-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-0.5 text-xs font-medium rounded bg-teal-100 text-teal-700 border border-teal-200">
                                {comm.type}
                              </span>
                              {comm.person && (
                                <span className="text-sm font-medium text-slate-700">{comm.person}</span>
                              )}
                            </div>
                            <p className="text-slate-800 leading-relaxed">{comm.description}</p>
                            <p className="text-xs text-slate-500 mt-2">
                              Added {new Date(comm.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {completed.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-slate-800 mb-4">Completed ({completed.length})</h2>
                <div className="grid gap-3">
                  {completed.map(comm => {
                    const Icon = getIcon(comm.type);
                    return (
                      <div key={comm.id} className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                        <div className="flex items-start gap-4">
                          <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Icon className="w-4 h-4 text-slate-400" />
                              {comm.person && (
                                <span className="text-sm font-medium text-slate-500">{comm.person}</span>
                              )}
                            </div>
                            <p className="text-slate-500 line-through">{comm.description}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PlannerShell>
  );
}
