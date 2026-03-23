import { useState, useEffect } from 'react';
import { ArrowLeft, CheckSquare, Plus, Tag, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PlannerShell } from '../PlannerShell';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

interface Task {
  id: string;
  title: string;
  context: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
}

export function TaskActionLists() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filterContext, setFilterContext] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  // Phase 4A: Remember last used context and priority for faster task entry
  const [newTask, setNewTask] = useState(() => {
    if (typeof window !== 'undefined') {
      const lastContext = localStorage.getItem('last_task_context') || 'general';
      const lastPriority = (localStorage.getItem('last_task_priority') || 'medium') as 'low' | 'medium' | 'high' | 'urgent';
      return {
        title: '',
        context: lastContext,
        priority: lastPriority
      };
    }
    return {
      title: '',
      context: 'general',
      priority: 'medium' as const
    };
  });

  const contexts = ['general', 'meetings', 'emails', 'calls', 'admin', 'creative', 'technical'];
  const priorities = ['low', 'medium', 'high', 'urgent'];

  useEffect(() => {
    if (user) {
      loadTasks();
    }
  }, [user]);

  const loadTasks = async () => {
    if (!user) return;
    setLoading(true);

    const { data } = await supabase
      .from('daily_planner_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('life_area', 'work')
      .ilike('tags', '%task%')
      .order('created_at', { ascending: false });

    if (data) {
      setTasks(data.map(t => {
        const metadata = t.metadata as any || {};
        return {
          id: t.id,
          title: t.title || '',
          context: metadata.context || 'general',
          completed: metadata.completed || false,
          priority: metadata.priority || 'medium',
          created_at: t.created_at
        };
      }));
    }

    setLoading(false);
  };

  const addTask = async () => {
    if (!user || !newTask.title.trim()) return;

    // Phase 4A: Save context and priority for next time
    if (typeof window !== 'undefined') {
      localStorage.setItem('last_task_context', newTask.context);
      localStorage.setItem('last_task_priority', newTask.priority);
    }

    await supabase
      .from('daily_planner_entries')
      .insert({
        user_id: user.id,
        life_area: 'work',
        title: newTask.title,
        tags: 'task',
        metadata: {
          context: newTask.context,
          priority: newTask.priority,
          completed: false
        }
      });

    // Phase 4A: Keep last context/priority, only clear title
    setNewTask({ ...newTask, title: '' });
    setShowForm(false);
    loadTasks();
    // Phase 4A: No success toast for frequent actions - silent success
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filterContext !== 'all' && task.context !== filterContext) return false;
    if (filterPriority !== 'all' && task.priority !== filterPriority) return false;
    return true;
  });

  const incompleteTasks = filteredTasks.filter(t => !t.completed);
  const completedTasks = filteredTasks.filter(t => t.completed);

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

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Task & Action Lists</h1>
              <p className="text-slate-600 mt-1">Organize and track work tasks by context</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              Add Task
            </button>
          </div>

          {showForm && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">New Task</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Task Description</label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="What needs to be done?"
                    autoFocus
                    // Phase 4A: Auto-focus for faster entry on mobile
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Context</label>
                    <select
                      value={newTask.context}
                      onChange={(e) => setNewTask({ ...newTask, context: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    >
                      {contexts.map(ctx => (
                        <option key={ctx} value={ctx}>{ctx}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Priority</label>
                    <select
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    >
                      {priorities.map(pri => (
                        <option key={pri} value={pri}>{pri}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={addTask}
                    className="px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
                  >
                    Save Task
                  </button>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      // Phase 4A: Keep context/priority, only clear title for faster re-entry
                      setNewTask({ ...newTask, title: '' });
                    }}
                    className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-600" />
              <select
                value={filterContext}
                onChange={(e) => setFilterContext(e.target.value)}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="all">All Contexts</option>
                {contexts.map(ctx => (
                  <option key={ctx} value={ctx}>{ctx}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-slate-600" />
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="all">All Priorities</option>
                {priorities.map(pri => (
                  <option key={pri} value={pri}>{pri}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-600">Loading tasks...</div>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-800 mb-4">To Do ({incompleteTasks.length})</h2>
              {incompleteTasks.length === 0 ? (
                <div className="bg-slate-50 rounded-xl p-8 text-center border border-slate-200">
                  <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-600">No tasks to do</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {incompleteTasks.map(task => (
                    <div key={task.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <CheckSquare className="w-5 h-5 text-slate-400 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-slate-800 font-medium">{task.title}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="px-2 py-0.5 text-xs font-medium rounded bg-teal-100 text-teal-700 border border-teal-200">
                                {task.context}
                              </span>
                              <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getPriorityColor(task.priority)}`}>
                                {task.priority}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {completedTasks.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-slate-800 mb-4">Completed ({completedTasks.length})</h2>
                <div className="grid gap-3">
                  {completedTasks.map(task => (
                    <div key={task.id} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <div className="flex items-start gap-3">
                        <CheckSquare className="w-5 h-5 text-green-500 mt-0.5" />
                        <p className="text-slate-500 line-through flex-1">{task.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PlannerShell>
  );
}
