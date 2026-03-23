import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Star, CheckSquare, Phone, Mail, ArrowRight, FileText, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PlannerShell } from '../PlannerShell';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
}

interface Task {
  id: string;
  title: string;
  is_priority: boolean;
  completed: boolean;
}

interface Communication {
  id: string;
  type: 'email' | 'call';
  description: string;
  completed: boolean;
}

interface Note {
  id: string;
  content: string;
  created_at: string;
}

export function DailyWorkFlow() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [priorities, setPriorities] = useState<Task[]>([]);
  const [actionItems, setActionItems] = useState<Task[]>([]);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [carryForward, setCarryForward] = useState<string[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);

  const [newCommunication, setNewCommunication] = useState({ type: 'email' as const, description: '' });
  const [newCarryItem, setNewCarryItem] = useState('');
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    if (user) {
      loadDailyData();
    }
  }, [user, selectedDate]);

  const loadDailyData = async () => {
    if (!user) return;
    setLoading(true);

    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Events are managed separately in the calendar view
    setEvents([]);

    const { data: priorityData } = await supabase
      .from('daily_planner_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('life_area', 'work')
      .ilike('tags', '%priority%')
      .limit(5)
      .order('created_at', { ascending: false });

    if (priorityData) {
      setPriorities(priorityData.map(p => {
        const metadata = p.metadata as any || {};
        return {
          id: p.id,
          title: p.title || '',
          is_priority: true,
          completed: metadata.completed || false
        };
      }));
    }

    const { data: tasksData } = await supabase
      .from('daily_planner_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('life_area', 'work')
      .ilike('tags', '%task%')
      .order('created_at', { ascending: false });

    if (tasksData) {
      setActionItems(tasksData.map(t => {
        const metadata = t.metadata as any || {};
        return {
          id: t.id,
          title: t.title || '',
          is_priority: false,
          completed: metadata.completed || false
        };
      }));
    }

    const { data: commsData } = await supabase
      .from('daily_planner_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('life_area', 'work')
      .ilike('tags', '%communication%')
      .order('created_at', { ascending: false });

    if (commsData) {
      setCommunications(commsData.map(c => {
        const metadata = c.metadata as any || {};
        return {
          id: c.id,
          type: metadata.type || 'email',
          description: c.title || '',
          completed: metadata.completed || false
        };
      }));
    }

    const { data: carryData } = await supabase
      .from('daily_planner_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('life_area', 'work')
      .ilike('tags', '%carry-forward%')
      .order('created_at', { ascending: false });

    if (carryData) {
      setCarryForward(carryData.map(c => c.title || ''));
    }

    const { data: notesData } = await supabase
      .from('daily_planner_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('life_area', 'work')
      .ilike('tags', '%quick-note%')
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString())
      .order('created_at', { ascending: false });

    if (notesData) {
      setNotes(notesData.map(n => ({
        id: n.id,
        content: n.content || '',
        created_at: n.created_at
      })));
    }

    setLoading(false);
  };

  const addCommunication = async () => {
    if (!user || !newCommunication.description.trim()) return;

    await supabase
      .from('daily_planner_entries')
      .insert({
        user_id: user.id,
        life_area: 'work',
        title: newCommunication.description,
        tags: 'communication',
        metadata: { type: newCommunication.type, completed: false }
      });

    setNewCommunication({ type: 'email', description: '' });
    loadDailyData();
  };

  const addCarryItem = async () => {
    if (!user || !newCarryItem.trim()) return;

    await supabase
      .from('daily_planner_entries')
      .insert({
        user_id: user.id,
        life_area: 'work',
        title: newCarryItem,
        tags: 'carry-forward',
        metadata: {}
      });

    setNewCarryItem('');
    loadDailyData();
  };

  const addNote = async () => {
    if (!user || !newNote.trim()) return;

    await supabase
      .from('daily_planner_entries')
      .insert({
        user_id: user.id,
        life_area: 'work',
        content: newNote,
        tags: 'quick-note',
        metadata: {}
      });

    setNewNote('');
    loadDailyData();
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  return (
    <PlannerShell>
      <div className="max-w-7xl mx-auto p-8">
        <button
          onClick={() => navigate('/planner/work')}
          className="flex items-center gap-2 px-4 py-2 mb-6 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to Work & Career</span>
        </button>

        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Daily Work Flow</h1>
            <p className="text-slate-600 mt-1">Time blocks, priorities, and action items for today</p>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-600">Loading daily flow...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-teal-600" />
                  <h2 className="text-xl font-semibold text-slate-800">Today's Schedule</h2>
                </div>
                {events.length === 0 ? (
                  <p className="text-slate-500 text-sm">No work events scheduled for today</p>
                ) : (
                  <div className="space-y-2">
                    {events.map(event => (
                      <div key={event.id} className="flex items-center gap-3 p-3 bg-teal-50 rounded-lg border border-teal-100">
                        <Calendar className="w-4 h-4 text-teal-600" />
                        <div className="flex-1">
                          <p className="font-medium text-slate-800">{event.title}</p>
                          <p className="text-xs text-slate-600">
                            {formatTime(event.start_time)} - {formatTime(event.end_time)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-5 h-5 text-teal-600" />
                  <h2 className="text-xl font-semibold text-slate-800">Top Priorities (Max 5)</h2>
                </div>
                {priorities.length === 0 ? (
                  <p className="text-slate-500 text-sm">No priorities set</p>
                ) : (
                  <div className="space-y-2">
                    {priorities.map(priority => (
                      <div key={priority.id} className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                        <Star className="w-4 h-4 text-amber-500" />
                        <span className={`flex-1 ${priority.completed ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                          {priority.title}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                  <CheckSquare className="w-5 h-5 text-teal-600" />
                  <h2 className="text-xl font-semibold text-slate-800">Action Items</h2>
                </div>
                {actionItems.length === 0 ? (
                  <p className="text-slate-500 text-sm">No action items</p>
                ) : (
                  <div className="space-y-2">
                    {actionItems.slice(0, 10).map(item => (
                      <div key={item.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded">
                        <CheckSquare className="w-4 h-4 text-slate-400" />
                        <span className={`flex-1 text-sm ${item.completed ? 'line-through text-slate-500' : 'text-slate-700'}`}>
                          {item.title}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                  <Mail className="w-5 h-5 text-teal-600" />
                  <h2 className="text-lg font-semibold text-slate-800">Communications</h2>
                </div>
                <div className="space-y-3 mb-4">
                  {communications.map(comm => (
                    <div key={comm.id} className="flex items-start gap-2 p-2 bg-slate-50 rounded">
                      {comm.type === 'email' ? (
                        <Mail className="w-4 h-4 text-slate-500 mt-0.5" />
                      ) : (
                        <Phone className="w-4 h-4 text-slate-500 mt-0.5" />
                      )}
                      <span className={`text-sm flex-1 ${comm.completed ? 'line-through text-slate-500' : 'text-slate-700'}`}>
                        {comm.description}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <select
                    value={newCommunication.type}
                    onChange={(e) => setNewCommunication({ ...newCommunication, type: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="email">Email</option>
                    <option value="call">Call</option>
                  </select>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCommunication.description}
                      onChange={(e) => setNewCommunication({ ...newCommunication, description: e.target.value })}
                      placeholder="Add communication..."
                      className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                    <button
                      onClick={addCommunication}
                      className="px-4 py-2 bg-teal-500 text-white text-sm rounded-lg hover:bg-teal-600 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                  <ArrowRight className="w-5 h-5 text-teal-600" />
                  <h2 className="text-lg font-semibold text-slate-800">For Tomorrow</h2>
                </div>
                <div className="space-y-2 mb-4">
                  {carryForward.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-cyan-50 rounded border border-cyan-100">
                      <ArrowRight className="w-3 h-3 text-cyan-600" />
                      <span className="text-sm text-slate-700">{item}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCarryItem}
                    onChange={(e) => setNewCarryItem(e.target.value)}
                    placeholder="Add to tomorrow..."
                    className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                  <button
                    onClick={addCarryItem}
                    className="px-4 py-2 bg-teal-500 text-white text-sm rounded-lg hover:bg-teal-600 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-teal-600" />
                  <h2 className="text-lg font-semibold text-slate-800">Quick Notes</h2>
                </div>
                <div className="space-y-2 mb-4">
                  {notes.map(note => (
                    <div key={note.id} className="p-2 bg-slate-50 rounded text-sm text-slate-700 leading-relaxed">
                      {note.content}
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add a quick note..."
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                  <button
                    onClick={addNote}
                    className="w-full px-4 py-2 bg-teal-500 text-white text-sm rounded-lg hover:bg-teal-600 transition-colors"
                  >
                    Add Note
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PlannerShell>
  );
}
