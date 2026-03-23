import { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Plus, X, Clock } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { updateRoadmapItem } from '../../../lib/guardrails';
import type { RoadmapItem } from '../../../lib/guardrailsTypes';

interface MicroTaskListProps {
  sessionId: string;
  trackId?: string | null;
  subtrackId?: string | null;
  masterProjectId: string;
}

interface SessionTask {
  id: string;
  title: string;
  completed: boolean;
  created_at: string;
}

export function MicroTaskList({ sessionId, trackId, subtrackId, masterProjectId }: MicroTaskListProps) {
  const [roadmapTasks, setRoadmapTasks] = useState<RoadmapItem[]>([]);
  const [sessionTasks, setSessionTasks] = useState<SessionTask[]>([]);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, [trackId, subtrackId, sessionId]);

  async function loadTasks() {
    setLoading(true);
    try {
      let query = supabase
        .from('roadmap_items')
        .select(`
          id,
          title,
          status,
          section_id,
          start_date,
          end_date,
          order_index,
          created_at,
          track_id,
          subtrack_id
        `)
        .eq('status', 'not_started')
        .order('start_date');

      const { data: sections } = await supabase
        .from('roadmap_sections')
        .select('id')
        .eq('master_project_id', masterProjectId);

      if (sections && sections.length > 0) {
        query = query.in('section_id', sections.map(s => s.id));
      }

      if (trackId) {
        query = query.eq('track_id', trackId);
      }

      if (subtrackId) {
        query = query.eq('subtrack_id', subtrackId);
      }

      const { data, error } = await query.limit(10);

      if (error) throw error;

      if (data) {
        setRoadmapTasks(data as RoadmapItem[]);
      }

      const { data: sessionTasksData } = await supabase
        .from('focus_session_micro_tasks')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (sessionTasksData) {
        setSessionTasks(sessionTasksData);
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRoadmapTaskToggle(taskId: string) {
    try {
      const task = roadmapTasks.find(t => t.id === taskId);
      if (!task) return;

      await updateRoadmapItem(taskId, {
        status: 'in_progress',
      });

      await loadTasks();
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  }

  async function handleSessionTaskToggle(taskId: string) {
    try {
      const task = sessionTasks.find(t => t.id === taskId);
      if (!task) return;

      await supabase
        .from('focus_session_micro_tasks')
        .update({ completed: !task.completed })
        .eq('id', taskId);

      setSessionTasks(prev =>
        prev.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t)
      );
    } catch (error) {
      console.error('Failed to toggle task:', error);
    }
  }

  async function handleAddSessionTask() {
    if (!newTaskTitle.trim()) return;

    try {
      const { data, error } = await supabase
        .from('focus_session_micro_tasks')
        .insert({
          session_id: sessionId,
          title: newTaskTitle.trim(),
          completed: false,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setSessionTasks(prev => [data, ...prev]);
      }

      setNewTaskTitle('');
      setIsAddingTask(false);
    } catch (error) {
      console.error('Failed to add task:', error);
      alert('Failed to add task. Please try again.');
    }
  }

  async function handleDeleteSessionTask(taskId: string) {
    try {
      await supabase
        .from('focus_session_micro_tasks')
        .delete()
        .eq('id', taskId);

      setSessionTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  }

  const completedCount = sessionTasks.filter(t => t.completed).length;
  const totalCount = sessionTasks.length + roadmapTasks.length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Micro Tasks</h3>
          <p className="text-xs text-gray-600">
            {completedCount} / {totalCount} completed
          </p>
        </div>
        <button
          onClick={() => setIsAddingTask(true)}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <Plus size={12} />
          Add
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
          </div>
        ) : (
          <div className="p-3 space-y-3">
            {isAddingTask && (
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddSessionTask();
                    if (e.key === 'Escape') {
                      setIsAddingTask(false);
                      setNewTaskTitle('');
                    }
                  }}
                  placeholder="Quick task for this session..."
                  autoFocus
                  className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleAddSessionTask}
                    className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingTask(false);
                      setNewTaskTitle('');
                    }}
                    className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {sessionTasks.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-2">Session Tasks</h4>
                <div className="space-y-1">
                  {sessionTasks.map(task => (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 group"
                    >
                      <button
                        onClick={() => handleSessionTaskToggle(task.id)}
                        className="flex-shrink-0"
                      >
                        {task.completed ? (
                          <CheckCircle2 size={16} className="text-green-600" />
                        ) : (
                          <Circle size={16} className="text-gray-400" />
                        )}
                      </button>
                      <span
                        className={`flex-1 text-sm ${
                          task.completed ? 'text-gray-500 line-through' : 'text-gray-900'
                        }`}
                      >
                        {task.title}
                      </span>
                      <button
                        onClick={() => handleDeleteSessionTask(task.id)}
                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {roadmapTasks.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  <Clock size={12} />
                  From Roadmap
                </h4>
                <div className="space-y-1">
                  {roadmapTasks.map(task => (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-gray-50"
                    >
                      <button
                        onClick={() => handleRoadmapTaskToggle(task.id)}
                        className="flex-shrink-0"
                      >
                        <Circle size={16} className="text-gray-400" />
                      </button>
                      <span className="flex-1 text-sm text-gray-900">
                        {task.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sessionTasks.length === 0 && roadmapTasks.length === 0 && !isAddingTask && (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">No tasks yet</p>
                <p className="text-xs text-gray-400 mt-1">Add micro-tasks to track quick wins</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
