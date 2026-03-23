/**
 * PlannerTasks - Tasks Aggregation View
 * 
 * Shows all incomplete standalone tasks (not linked to events), sorted by date.
 * Event-linked tasks are NOT shown here (they appear only within their events).
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, Square, Calendar, Loader2, AlertCircle, Plus, Clock, X, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useActiveTaskContext } from '../../contexts/ActiveTaskContext';
import { contextToTaskScope, getTaskContextKey, getTaskPermissionLabel } from '../../lib/personalSpaces/activeTaskContext';
import { TaskSelector } from './TaskSelector';
import {
  getIncompleteStandaloneTasksForUser,
  getTodayTasks,
  getUpcomingTasks,
  getCompletedTasks,
  updateEventTask,
  deleteEventTask,
  type EventTask,
} from '../../lib/personalSpaces/eventTasksService';
import { TaskCreationModal } from '../tasks/TaskCreationModal';
import { TaskProgressSlider } from '../tasks/TaskProgressSlider';
import { PlannerShell } from './PlannerShell';

type TaskFilter = 'today' | 'upcoming' | 'completed';

interface TaskWithEventInfo extends EventTask {
  event_title?: string;
  event_type?: string | null;
  event_color?: string | null;
}

export function PlannerTasks() {
  const { user } = useAuth();
  const { activeContext, isReadOnly, setActiveContext } = useActiveTaskContext();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<TaskWithEventInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [filter, setFilter] = useState<TaskFilter>('today'); // Default to Today
  const previousContextRef = useRef<string>('');

  // Convert active task context to scope using centralized utility
  // @TEST Critical path: Wrong scope = wrong tasks loaded
  const scope = useMemo(() => {
    if (!user) return { userId: '' };
    return contextToTaskScope(activeContext, user.id);
  }, [activeContext, user]);

  // Close modal and reset state when context changes
  useEffect(() => {
    const contextKey = getTaskContextKey(activeContext);

    if (previousContextRef.current && previousContextRef.current !== contextKey) {
      setIsTaskModalOpen(false);
      setTasks([]);
    }

    previousContextRef.current = contextKey;
  }, [activeContext]);

  // Handle revoked access
  const handleRevokedAccess = () => {
    // Context already updated by provider, just reload tasks
    loadTasks();
  };

  // Load tasks based on current filter and scope
  const loadTasks = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    try {
      let loadedTasks: TaskWithEventInfo[] = [];
      
      // For now, household and shared task lists use userId from context
      // Future: implement household and shared task fetching
      const userId = activeContext.kind === 'personal' || activeContext.kind === 'shared'
        ? activeContext.ownerUserId
        : activeContext.kind === 'household'
        ? user.id // Fallback to user.id for household until household task query is implemented
        : user.id;
      
      switch (filter) {
        case 'today':
          loadedTasks = (await getTodayTasks(userId)) as TaskWithEventInfo[];
          break;
        case 'upcoming':
          loadedTasks = (await getUpcomingTasks(userId)) as TaskWithEventInfo[];
          break;
        case 'completed':
          loadedTasks = (await getCompletedTasks(userId)) as TaskWithEventInfo[];
          break;
        default:
          loadedTasks = (await getTodayTasks(userId)) as TaskWithEventInfo[];
      }
      
      setTasks(loadedTasks);
    } catch (err) {
      console.error('[PlannerTasks] Error loading tasks:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [user, filter, activeContext]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Refresh tasks when component becomes visible
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        loadTasks();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user, loadTasks]);

  // Toggle task completion (Phase 6: Sets progress to 100% or previous value)
  const handleToggleTask = async (task: TaskWithEventInfo) => {
    try {
      const newCompleted = !task.completed;
      const updatedTask = await updateEventTask(task.id, {
        completed: newCompleted,
        // Progress will be synced automatically: completed=true → progress=100, completed=false → preserve or 0
      });
      
      // Optimistic update based on filter
      if (filter === 'completed') {
        // If viewing completed, remove it if uncompleting
        if (!newCompleted) {
          setTasks(tasks.filter(t => t.id !== task.id));
        } else {
          // Reload to get updated completed_at and progress
          loadTasks();
        }
      } else if (filter === 'today') {
        // If viewing today, keep it but update status
        setTasks(tasks.map(t => 
          t.id === task.id 
            ? { ...t, ...updatedTask, completed: newCompleted, status: newCompleted ? 'completed' : 'pending' }
            : t
        ));
      } else {
        // If viewing upcoming and completing, remove it
        if (newCompleted) {
          setTasks(tasks.filter(t => t.id !== task.id));
        } else {
          // Reload to refresh
          loadTasks();
        }
      }
    } catch (err) {
      console.error('[PlannerTasks] Error updating task:', err);
      setError(err instanceof Error ? err.message : 'Failed to update task');
      // Reload on error to ensure consistency
      loadTasks();
    }
  };

  // Handle progress change (Phase 6: Progress slider)
  const handleProgressChange = async (taskId: string, progress: number) => {
    try {
      const updatedTask = await updateEventTask(taskId, {
        progress: progress,
        // Status and completed will be synced automatically: progress=100 → completed=true, progress<100 → completed=false
      });
      
      // Update task in list
      setTasks(tasks.map(t => 
        t.id === taskId 
          ? { ...t, ...updatedTask }
          : t
      ));
      
      // If completing (progress = 100) and viewing today/upcoming, remove from list
      if (progress === 100 && filter !== 'completed') {
        setTasks(tasks.filter(t => t.id !== taskId));
      }
      // If uncompleting (progress < 100) and viewing completed, remove from list
      else if (progress < 100 && filter === 'completed') {
        setTasks(tasks.filter(t => t.id !== taskId));
      }
    } catch (err) {
      console.error('[PlannerTasks] Error updating task progress:', err);
      setError(err instanceof Error ? err.message : 'Failed to update task progress');
      // Reload on error to ensure consistency
      loadTasks();
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteEventTask(taskId);
      setTasks(tasks.filter(t => t.id !== taskId));
    } catch (err) {
      console.error('[PlannerTasks] Error deleting task:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete task');
      loadTasks();
    }
  };

  // Navigate to day view for task date
  const handleTaskDateClick = (taskDate: string) => {
    navigate(`/planner/calendar?view=day&date=${taskDate}`);
  };

  // Format date for display
  const formatTaskDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(date);
    taskDate.setHours(0, 0, 0, 0);

    const diffTime = taskDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
    if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  };

  // Format time for display
  const formatTime = (timeString: string | null): string => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <PlannerShell>
      <div className="flex flex-col h-full bg-white">
        {/* Read-only banner for shared task lists */}
        {activeContext.kind === 'shared' && (
          <div className="px-4 py-2 bg-blue-50 border-b border-blue-200 flex items-center gap-2 text-xs sm:text-sm safe-top flex-wrap">
            <span className="text-blue-700 font-medium">
              Viewing {activeContext.ownerName}'s Tasks
            </span>
            <span className="text-blue-600 hidden sm:inline">•</span>
            <span className="text-blue-600">
              {getTaskPermissionLabel(activeContext) || 'Write access'}
            </span>
          </div>
        )}

        {/* Header */}
        <div className="px-4 py-3 sm:py-4 md:px-6 md:py-5 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Back Button */}
              <button
                onClick={() => navigate('/planner/calendar?view=month')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0"
                aria-label="Back to calendar"
                title="Back to calendar"
              >
                <ArrowLeft size={20} className="text-gray-700" />
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Tasks</h1>
                <p className="text-xs sm:text-sm md:text-base text-gray-600 mt-1 leading-relaxed">
                  Manage what you need to do
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Task Selector */}
              <TaskSelector
                activeContext={activeContext}
                onContextChange={setActiveContext}
                onRevokedAccess={handleRevokedAccess}
              />
              {/* Add Task Button - Hidden in read-only mode */}
            {!isReadOnly && (
              <button
                onClick={() => setIsTaskModalOpen(true)}
                className="px-3 py-2 sm:px-4 text-xs sm:text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 sm:gap-2 min-h-[44px]"
              >
                <Plus size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Add Task</span>
              </button>
            )}
            </div>
          </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          <button
            onClick={() => setFilter('today')}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-colors flex-shrink-0 min-h-[44px] flex items-center justify-center ${
              filter === 'today'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-colors flex-shrink-0 min-h-[44px] flex items-center justify-center ${
              filter === 'upcoming'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-colors flex-shrink-0 min-h-[44px] flex items-center justify-center ${
              filter === 'completed'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Completed
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-red-400 mb-3" />
            <p className="text-xs sm:text-sm text-gray-600 text-center max-w-sm">{error}</p>
            <button
              onClick={loadTasks}
              className="mt-4 px-4 py-2 text-xs sm:text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors min-h-[44px]"
            >
              Try Again
            </button>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <CheckSquare className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mb-4" />
            <p className="text-base sm:text-lg font-medium text-gray-900 mb-1 text-center">No tasks here yet</p>
            <p className="text-xs sm:text-sm text-gray-500 mb-6 text-center max-w-sm">
              {filter === 'completed' 
                ? 'Completed tasks will appear here.'
                : 'Add a task to plan what you need to do.'}
            </p>
            {filter !== 'completed' && (
              <button
                onClick={() => setIsTaskModalOpen(true)}
                className="px-5 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 min-h-[44px]"
              >
                <Plus size={16} className="sm:w-[18px] sm:h-[18px]" />
                Add Task
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const isCompleted = task.status === 'completed' || task.completed || (task.progress ?? 0) === 100;
              const progress = task.progress ?? 0;
              
              return (
                <div
                  key={task.id}
                  className={`p-3 sm:p-4 bg-white border rounded-lg hover:border-gray-300 hover:shadow-sm transition-all group ${
                    isCompleted 
                      ? 'border-gray-100 opacity-75' 
                      : 'border-gray-200'
                  }`}
                >
                  {/* Top Row: Checkbox + Title + Delete */}
                  <div className="flex items-start gap-3 mb-2">
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={() => !isReadOnly && handleToggleTask(task)}
                      disabled={isReadOnly}
                      className={`flex-shrink-0 mt-0.5 p-1 rounded transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${
                        isReadOnly 
                          ? 'cursor-not-allowed opacity-50' 
                          : 'hover:bg-gray-100'
                      }`}
                      aria-label={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
                    >
                      {isCompleted ? (
                        <CheckSquare size={20} className="text-green-600" />
                      ) : (
                        <Square size={20} className="text-gray-400" />
                      )}
                    </button>

                    {/* Task Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-1">
                        <p className={`text-sm sm:text-base font-medium flex-1 ${
                          isCompleted 
                            ? 'text-gray-500 line-through' 
                            : 'text-gray-900'
                        }`}>
                          {task.title}
                        </p>
                        {/* Delete Button - Hidden in read-only mode */}
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={() => handleDeleteTask(task.id)}
                            className="flex-shrink-0 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
                            aria-label="Delete task"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                      
                      {/* Task Date & Time & Event Info */}
                      <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm mb-2 flex-wrap">
                        {task.event_id && task.event_title && (
                          <span className={`font-medium ${
                            isCompleted ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            {task.event_title}
                            <span className="text-gray-400 mx-1.5">·</span>
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => task.date && handleTaskDateClick(task.date)}
                          className={`flex items-center gap-1.5 transition-colors ${
                            isCompleted
                              ? 'text-gray-400'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          <Calendar size={14} className={isCompleted ? 'text-gray-400' : 'text-gray-400'} />
                          <span>{task.date ? formatTaskDate(task.date) : 'No date'}</span>
                        </button>
                        {task.start_time && (
                          <>
                            <span className="text-gray-400">·</span>
                            <div className={`flex items-center gap-1 ${isCompleted ? 'text-gray-400' : 'text-gray-500'}`}>
                              <Clock size={14} />
                              <span>{formatTime(task.start_time)}</span>
                              {task.duration_minutes && (
                                <span>
                                  ({task.duration_minutes} min)
                                </span>
                              )}
                            </div>
                          </>
                        )}
                        {isCompleted && task.completed_at && (
                          <>
                            <span className="text-gray-400">·</span>
                            <span className={`text-xs ${isCompleted ? 'text-gray-400' : 'text-gray-500'}`}>
                              Completed {new Date(task.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Progress Slider (Phase 6) - Hidden for completed tasks, shown for pending/partial, disabled in read-only */}
                      {!isCompleted && progress < 100 && filter !== 'completed' && (
                        <div className="mt-2">
                          <TaskProgressSlider
                            taskId={task.id}
                            currentProgress={progress}
                            onProgressChange={handleProgressChange}
                            disabled={isReadOnly}
                            size="sm"
                            showLabel={true}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Task Creation Modal - Only show if not read-only */}
      {user && !isReadOnly && (
        <TaskCreationModal
          userId={activeContext.kind === 'shared' ? activeContext.ownerUserId : user.id}
          isOpen={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
          onSaved={() => {
            loadTasks();
            setIsTaskModalOpen(false);
          }}
        />
      )}
      </div>
    </PlannerShell>
  );
}
