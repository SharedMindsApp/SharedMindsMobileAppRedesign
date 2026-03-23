import { useState, useEffect } from 'react';
import { Sparkles, Plus, CheckCircle, Circle, Calendar as CalendarIcon, Clock, User, Edit, Trash2, RotateCcw, Home } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { PlannerShell } from '../PlannerShell';

interface CleaningTask {
  id: string;
  task_name: string;
  room: string | null;
  frequency: 'daily' | 'weekly' | 'monthly';
  last_completed: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  created_at: string;
}

interface HouseholdMember {
  id: string;
  name: string;
  avatar_color: string;
}

type ViewMode = 'daily' | 'weekly' | 'monthly' | 'rooms';

export function HouseholdCleaning() {
  const { user } = useAuth();
  const [householdId, setHouseholdId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<CleaningTask[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<CleaningTask | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);

  // Form state
  const [taskName, setTaskName] = useState('');
  const [room, setRoom] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [assignedTo, setAssignedTo] = useState<string>('');

  useEffect(() => {
    loadHousehold();
  }, [user]);

  useEffect(() => {
    if (householdId) {
      loadTasks();
      loadMembers();
    }
  }, [householdId]);

  async function loadHousehold() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('auth_user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;
      if (data?.household_id) {
        setHouseholdId(data.household_id);
      }
    } catch (error) {
      console.error('Failed to load household:', error);
    }
  }

  async function loadTasks() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('household_cleaning_tasks')
        .select('*')
        .eq('household_id', householdId)
        .order('frequency', { ascending: true })
        .order('task_name', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadMembers() {
    try {
      const { data, error } = await supabase
        .from('household_members')
        .select('id, name, avatar_color')
        .eq('household_id', householdId)
        .eq('status', 'active');

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  }

  async function handleSaveTask() {
    if (!taskName.trim()) return;

    try {
      const memberId = assignedTo || null;
      const memberName = members.find(m => m.id === assignedTo)?.name || null;

      if (editingTask) {
        const { error } = await supabase
          .from('household_cleaning_tasks')
          .update({
            task_name: taskName,
            room: room || null,
            frequency,
            assigned_to: memberId,
            assigned_to_name: memberName,
          })
          .eq('id', editingTask.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('household_cleaning_tasks')
          .insert({
            household_id: householdId,
            task_name: taskName,
            room: room || null,
            frequency,
            assigned_to: memberId,
            assigned_to_name: memberName,
          });

        if (error) throw error;
      }

      await loadTasks();
      resetForm();
    } catch (error) {
      console.error('Failed to save task:', error);
    }
  }

  async function handleMarkCompleted(taskId: string) {
    try {
      const { error } = await supabase
        .from('household_cleaning_tasks')
        .update({ last_completed: new Date().toISOString() })
        .eq('id', taskId);

      if (error) throw error;
      await loadTasks();
    } catch (error) {
      console.error('Failed to mark completed:', error);
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const { error } = await supabase
        .from('household_cleaning_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      await loadTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  }

  function resetForm() {
    setTaskName('');
    setRoom('');
    setFrequency('weekly');
    setAssignedTo('');
    setEditingTask(null);
    setShowAddModal(false);
  }

  function handleEditTask(task: CleaningTask) {
    setEditingTask(task);
    setTaskName(task.task_name);
    setRoom(task.room || '');
    setFrequency(task.frequency);
    setAssignedTo(task.assigned_to || '');
    setShowAddModal(true);
  }

  function isOverdue(task: CleaningTask): boolean {
    if (!task.last_completed) return true;

    const lastCompleted = new Date(task.last_completed);
    const now = new Date();
    const daysSince = Math.floor((now.getTime() - lastCompleted.getTime()) / (1000 * 60 * 60 * 24));

    switch (task.frequency) {
      case 'daily': return daysSince >= 1;
      case 'weekly': return daysSince >= 7;
      case 'monthly': return daysSince >= 30;
      default: return false;
    }
  }

  function getDaysUntilDue(task: CleaningTask): string {
    if (!task.last_completed) return 'Overdue';

    const lastCompleted = new Date(task.last_completed);
    const now = new Date();
    const daysSince = Math.floor((now.getTime() - lastCompleted.getTime()) / (1000 * 60 * 60 * 24));

    let targetDays = 0;
    switch (task.frequency) {
      case 'daily': targetDays = 1; break;
      case 'weekly': targetDays = 7; break;
      case 'monthly': targetDays = 30; break;
    }

    const daysRemaining = targetDays - daysSince;
    if (daysRemaining <= 0) return 'Overdue';
    if (daysRemaining === 1) return 'Due tomorrow';
    return `${daysRemaining} days left`;
  }

  function filterTasksByView(tasks: CleaningTask[]): CleaningTask[] {
    if (viewMode === 'rooms') return tasks;
    return tasks.filter(t => t.frequency === viewMode);
  }

  function groupTasksByRoom(tasks: CleaningTask[]): Record<string, CleaningTask[]> {
    const grouped: Record<string, CleaningTask[]> = {};
    tasks.forEach(task => {
      const room = task.room || 'Unassigned';
      if (!grouped[room]) grouped[room] = [];
      grouped[room].push(task);
    });
    return grouped;
  }

  const filteredTasks = filterTasksByView(tasks);
  const overdueTasks = filteredTasks.filter(isOverdue);
  const upcomingTasks = filteredTasks.filter(t => !isOverdue(t));

  const getFrequencyBadgeColor = (frequency: string) => {
    switch (frequency) {
      case 'daily': return 'bg-red-100 text-red-700';
      case 'weekly': return 'bg-amber-100 text-amber-700';
      case 'monthly': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <PlannerShell>
      <div className="h-full flex flex-col bg-cyan-50">
        {/* Header */}
        <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 px-6 py-5 flex-shrink-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <Sparkles size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Cleaning & Maintenance</h2>
              <p className="text-cyan-100 text-sm">
                {filteredTasks.length} tasks • {overdueTasks.length} overdue
              </p>
            </div>
          </div>

          {/* View Mode Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('daily')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                viewMode === 'daily'
                  ? 'bg-white text-cyan-600 shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Clock size={18} />
              Daily
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                viewMode === 'weekly'
                  ? 'bg-white text-cyan-600 shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <CalendarIcon size={18} />
              Weekly
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                viewMode === 'monthly'
                  ? 'bg-white text-cyan-600 shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <RotateCcw size={18} />
              Monthly
            </button>
            <button
              onClick={() => setViewMode('rooms')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                viewMode === 'rooms'
                  ? 'bg-white text-cyan-600 shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Home size={18} />
              By Room
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-cyan-600 font-medium">Loading tasks...</div>
            </div>
          ) : (
            <>
              {/* Add Task Button */}
              <button
                onClick={() => setShowAddModal(true)}
                className="w-full mb-6 px-6 py-4 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-cyan-700 transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <Plus size={20} />
                Add Cleaning Task
              </button>

              {viewMode === 'rooms' ? (
                /* Grouped by Room */
                Object.entries(groupTasksByRoom(tasks)).map(([roomName, roomTasks]) => (
                  <div key={roomName} className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Home size={20} className="text-cyan-600" />
                      {roomName}
                    </h3>
                    <div className="space-y-3">
                      {roomTasks.map(task => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          isOverdue={isOverdue(task)}
                          daysUntilDue={getDaysUntilDue(task)}
                          onMarkCompleted={handleMarkCompleted}
                          onEdit={handleEditTask}
                          onDelete={handleDeleteTask}
                          getFrequencyBadgeColor={getFrequencyBadgeColor}
                        />
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <>
                  {/* Overdue Tasks */}
                  {overdueTasks.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-bold text-red-600 mb-3">Overdue Tasks</h3>
                      <div className="space-y-3">
                        {overdueTasks.map(task => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            isOverdue={true}
                            daysUntilDue={getDaysUntilDue(task)}
                            onMarkCompleted={handleMarkCompleted}
                            onEdit={handleEditTask}
                            onDelete={handleDeleteTask}
                            getFrequencyBadgeColor={getFrequencyBadgeColor}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upcoming Tasks */}
                  {upcomingTasks.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-3">Up to Date</h3>
                      <div className="space-y-3">
                        {upcomingTasks.map(task => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            isOverdue={false}
                            daysUntilDue={getDaysUntilDue(task)}
                            onMarkCompleted={handleMarkCompleted}
                            onEdit={handleEditTask}
                            onDelete={handleDeleteTask}
                            getFrequencyBadgeColor={getFrequencyBadgeColor}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {filteredTasks.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                      <Sparkles size={48} className="mb-4 text-gray-300" />
                      <p className="text-lg font-medium">No {viewMode} tasks</p>
                      <p className="text-sm">Add tasks to keep your home sparkling clean</p>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add/Edit Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {editingTask ? 'Edit Task' : 'Add Cleaning Task'}
              </h2>
              <button
                onClick={resetForm}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <Plus size={20} className="rotate-45" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Task Name *
                </label>
                <input
                  type="text"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  placeholder="e.g., Vacuum living room"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-cyan-500 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Room
                </label>
                <input
                  type="text"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="e.g., Living room"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-cyan-500 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Frequency *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['daily', 'weekly', 'monthly'] as const).map(freq => (
                    <button
                      key={freq}
                      onClick={() => setFrequency(freq)}
                      className={`py-2 px-3 rounded-lg font-medium transition-all capitalize ${
                        frequency === freq
                          ? 'bg-cyan-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {freq}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Assign To
                </label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-cyan-500 focus:outline-none transition-colors"
                >
                  <option value="">Unassigned</option>
                  {members.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTask}
                  disabled={!taskName.trim()}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingTask ? 'Save Changes' : 'Add Task'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PlannerShell>
  );
}

// Task Card Component
interface TaskCardProps {
  task: CleaningTask;
  isOverdue: boolean;
  daysUntilDue: string;
  onMarkCompleted: (id: string) => void;
  onEdit: (task: CleaningTask) => void;
  onDelete: (id: string) => void;
  getFrequencyBadgeColor: (frequency: string) => string;
}

function TaskCard({ task, isOverdue, daysUntilDue, onMarkCompleted, onEdit, onDelete, getFrequencyBadgeColor }: TaskCardProps) {
  return (
    <div className={`bg-white rounded-xl p-4 shadow-sm border-2 transition-all ${
      isOverdue ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-cyan-300'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {isOverdue ? (
              <Circle size={20} className="text-red-500" />
            ) : (
              <CheckCircle size={20} className="text-green-500" />
            )}
            <h4 className="font-semibold text-gray-900">{task.task_name}</h4>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            {task.room && (
              <>
                <Home size={14} />
                <span>{task.room}</span>
                <span>•</span>
              </>
            )}
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getFrequencyBadgeColor(task.frequency)}`}>
              {task.frequency}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <CalendarIcon size={14} className={isOverdue ? 'text-red-600' : 'text-gray-600'} />
            <span className={`font-medium ${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>
              {daysUntilDue}
            </span>
            {task.assigned_to_name && (
              <>
                <span className="text-gray-400">•</span>
                <User size={14} className="text-gray-600" />
                <span className="text-gray-600">{task.assigned_to_name}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-1 ml-2">
          <button
            onClick={() => onEdit(task)}
            className="p-2 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
            title="Edit task"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete task"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <button
        onClick={() => onMarkCompleted(task.id)}
        className={`w-full py-2 px-4 rounded-lg font-semibold transition-all ${
          isOverdue
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-green-500 hover:bg-green-600 text-white'
        }`}
      >
        Mark as Completed
      </button>
    </div>
  );
}
