import { PlannerShell } from '../PlannerShell';
import { CheckSquare, Plus, Trash2, Share2, Calendar, Flag, X, ChevronDown, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import * as todosService from '../../../lib/todosService';
import { createTodo } from '../../../lib/todosServiceOffline';
import { showToast } from '../../Toast';
import type { PersonalTodo, TodoPriority } from '../../../lib/todosService';
import { TodoBreakdownModal } from './TodoBreakdownModal';
import {
  getTaskBreakdown,
  completeMicroStep,
  uncompleteMicroStep,
  type MicroStep,
} from '../../../lib/intelligentTodoService';
import { supabase } from '../../../lib/supabase';

export function UnifiedTodoList() {
  const [loading, setLoading] = useState(true);
  const [todos, setTodos] = useState<PersonalTodo[]>([]);
  const [personalSpaceId, setPersonalSpaceId] = useState<string | null>(null);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoDescription, setNewTodoDescription] = useState('');
  const [newTodoDueDate, setNewTodoDueDate] = useState('');
  const [newTodoPriority, setNewTodoPriority] = useState<TodoPriority>('medium');
  const [showAddForm, setShowAddForm] = useState(false);
  const [sharingTodoId, setSharingTodoId] = useState<string | null>(null);
  const [availableSpaces, setAvailableSpaces] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [expandedTodos, setExpandedTodos] = useState<Set<string>>(new Set());
  const [breakdownTodoId, setBreakdownTodoId] = useState<string | null>(null);
  const [microSteps, setMicroSteps] = useState<Record<string, MicroStep[]>>({});
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Get user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);

      const spaceId = await todosService.getPersonalSpace();
      setPersonalSpaceId(spaceId);

      // Load personal todos (household_id IS NULL)
      await loadTodos(null);

      const spaces = await todosService.getAvailableSpaces();
      setAvailableSpaces(spaces);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTodos = async (spaceId: string | null) => {
    try {
      // For personal todos, pass null (household_id IS NULL)
      const data = await todosService.getTodos(null);
      setTodos(data);
      
      // Load micro-steps for todos with breakdowns
      const todosWithBreakdowns = data.filter(t => t.has_breakdown);
      const stepsMap: Record<string, MicroStep[]> = {};
      
      for (const todo of todosWithBreakdowns) {
        try {
          const steps = await getTaskBreakdown(todo.id);
          stepsMap[todo.id] = steps;
        } catch (error) {
          console.error(`Error loading micro-steps for todo ${todo.id}:`, error);
        }
      }
      
      setMicroSteps(stepsMap);
    } catch (error) {
      console.error('Error loading todos:', error);
    }
  };
  
  const handleBreakdownSaved = async () => {
    await loadTodos(null); // Personal todos have household_id = NULL
  };
  
  const handleToggleMicroStep = async (microStepId: string, completed: boolean) => {
    try {
      if (completed) {
        await completeMicroStep(microStepId);
      } else {
        await uncompleteMicroStep(microStepId);
      }
      
      // Reload micro-steps
      await loadTodos(null); // Personal todos have household_id = NULL
    } catch (error) {
      console.error('Error toggling micro-step:', error);
      showToast('error', 'Failed to update step. Please try again.');
    }
  };

  const handleToggle = async (todo: PersonalTodo) => {
    try {
      await todosService.updateTodo(todo.id, { completed: !todo.completed });
      await loadTodos(null); // Personal todos have household_id = NULL
    } catch (error) {
      console.error('Error updating todo:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this task?')) return;
    try {
      await todosService.deleteTodo(id);
      await loadTodos(null); // Personal todos have household_id = NULL
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim() || !personalSpaceId) return;

    try {
      // Personal todos: householdId must be null (personal spaces are NOT households)
      await createTodo({
        householdId: null, // Personal todos must have household_id = NULL
        title: newTodoTitle,
        description: newTodoDescription || undefined,
        dueDate: newTodoDueDate || undefined,
        priority: newTodoPriority,
        spaceMode: 'personal', // Personal todos only require user_id = auth.uid()
      });

      setNewTodoTitle('');
      setNewTodoDescription('');
      setNewTodoDueDate('');
      setNewTodoPriority('medium');
      setShowAddForm(false);

      await loadTodos(null); // Personal todos have household_id = NULL
    } catch (error) {
      console.error('Error creating todo:', error);
      showToast('error', 'Failed to create task. Please try again.');
    }
  };

  const handleShareToSpace = async (todoId: string, spaceId: string) => {
    try {
      await todosService.shareToSpace(todoId, spaceId);
      await loadTodos(null); // Personal todos have household_id = NULL
      setSharingTodoId(null);
    } catch (error) {
      console.error('Error sharing todo:', error);
    }
  };

  const handleUnshare = async (shareId: string) => {
    try {
      await todosService.unshareFromSpace(shareId);
      await loadTodos(null); // Personal todos have household_id = NULL
    } catch (error) {
      console.error('Error unsharing todo:', error);
    }
  };

  const handleClearCompleted = async () => {
    if (!confirm('Clear all completed tasks?')) return;
    try {
      // Personal todos have household_id = NULL
      await todosService.clearCompleted(null);
      await loadTodos(null); // Personal todos have household_id = NULL
    } catch (error) {
      console.error('Error clearing completed:', error);
    }
  };

  const toggleExpanded = (todoId: string) => {
    setExpandedTodos(prev => {
      const next = new Set(prev);
      if (next.has(todoId)) {
        next.delete(todoId);
      } else {
        next.add(todoId);
      }
      return next;
    });
  };

  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  const completedCount = todos.filter(t => t.completed).length;

  const getPriorityColor = (priority: TodoPriority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-amber-600 bg-amber-50';
      case 'low': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
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

  if (!personalSpaceId) {
    return (
      <PlannerShell>
        <div className="max-w-4xl mx-auto p-8">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
            <p className="text-amber-800">Personal Space not found. Please create one first.</p>
          </div>
        </div>
      </PlannerShell>
    );
  }

  return (
    <PlannerShell>
      <div className="max-w-4xl mx-auto p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckSquare className="w-6 h-6 text-emerald-700" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-800">To-Do List</h1>
                <p className="text-sm text-slate-600">Personal tasks with optional sharing</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Task
            </button>
          </div>
        </div>

        {todos.length > 0 && (
          <div className="bg-emerald-50 rounded-lg p-4 mb-6 flex items-center justify-between">
            <p className="text-sm text-emerald-800">
              {completedCount} of {todos.length} completed
            </p>
            <div className="flex items-center gap-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="px-3 py-1 text-sm border border-emerald-200 rounded-lg bg-white text-emerald-800"
              >
                <option value="all">All Tasks</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
              {completedCount > 0 && (
                <button
                  onClick={handleClearCompleted}
                  className="px-3 py-1 text-sm text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 rounded-lg transition-colors"
                >
                  Clear Completed
                </button>
              )}
            </div>
          </div>
        )}

        {showAddForm && (
          <form onSubmit={handleAdd} className="bg-white rounded-xl p-6 border border-slate-200 mb-6 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-4">New Task</h3>
            <div className="space-y-4">
              <input
                type="text"
                value={newTodoTitle}
                onChange={(e) => setNewTodoTitle(e.target.value)}
                placeholder="Task title..."
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                autoFocus
              />
              <textarea
                value={newTodoDescription}
                onChange={(e) => setNewTodoDescription(e.target.value)}
                placeholder="Description (optional)..."
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 resize-none"
                rows={2}
              />
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newTodoDueDate}
                    onChange={(e) => setNewTodoDueDate(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                  <select
                    value={newTodoPriority}
                    onChange={(e) => setNewTodoPriority(e.target.value as TodoPriority)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Task
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {filteredTodos.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
              <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                {filter === 'all' ? 'No tasks yet' : `No ${filter} tasks`}
              </h3>
              <p className="text-slate-600">
                {filter === 'all' ? 'Add your first task to get started' : 'Try a different filter'}
              </p>
            </div>
          ) : (
            filteredTodos.map((todo) => {
              const isExpanded = expandedTodos.has(todo.id);
              const hasDetails = todo.description || todo.due_date || todo.shared_spaces && todo.shared_spaces.length > 0;

              return (
                <div key={todo.id} className="bg-white rounded-lg border border-slate-200 hover:shadow-md transition-shadow">
                  <div className="p-4 flex items-start gap-4">
                    <button
                      onClick={() => handleToggle(todo)}
                      className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors mt-0.5 ${
                        todo.completed
                          ? 'bg-emerald-600 border-emerald-600'
                          : 'border-slate-300 hover:border-emerald-400'
                      }`}
                    >
                      {todo.completed && (
                        <CheckSquare className="w-4 h-4 text-white" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <span className={`flex-1 ${todo.completed ? 'line-through text-slate-400' : 'text-slate-800 font-medium'}`}>
                          {todo.title}
                        </span>
                        <span className={`flex-shrink-0 px-2 py-1 text-xs font-medium rounded ${getPriorityColor(todo.priority)}`}>
                          {todo.priority}
                        </span>
                      </div>

                      {(hasDetails || todo.has_breakdown) && isExpanded && (
                        <div className="mt-3 space-y-2">
                          {todo.description && (
                            <p className="text-sm text-slate-600">{todo.description}</p>
                          )}
                          {todo.due_date && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Calendar className="w-4 h-4" />
                              <span>Due: {new Date(todo.due_date).toLocaleDateString()}</span>
                            </div>
                          )}
                          {todo.has_breakdown && microSteps[todo.id] && (
                            <div className="mt-3 pt-3 border-t border-slate-200">
                              <div className="flex items-center gap-2 mb-2">
                                <Target className="w-4 h-4 text-purple-600" />
                                <span className="text-sm font-medium text-slate-700">
                                  Micro-steps ({microSteps[todo.id].filter(s => s.completed).length} of {microSteps[todo.id].length})
                                </span>
                              </div>
                              <div className="space-y-1.5">
                                {microSteps[todo.id].map((step) => (
                                  <label
                                    key={step.id}
                                    className="flex items-start gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={step.completed}
                                      onChange={(e) => handleToggleMicroStep(step.id, e.target.checked)}
                                      className="mt-1 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                    />
                                    <span className={`text-sm flex-1 ${step.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                      {step.title}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                          {todo.shared_spaces && todo.shared_spaces.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {todo.shared_spaces.map((share) => (
                                <div key={share.id} className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                                  <Share2 className="w-3 h-3" />
                                  <span>{share.space_name}</span>
                                  <button
                                    onClick={() => handleUnshare(share.id)}
                                    className="hover:text-blue-900"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {todo.has_breakdown && !isExpanded && (
                        <div className="mt-2 text-xs text-purple-600 flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          <span>
                            {microSteps[todo.id] 
                              ? `${microSteps[todo.id].filter(s => s.completed).length} of ${microSteps[todo.id].length} steps`
                              : 'Has breakdown'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex-shrink-0 flex items-center gap-1">
                      {!todo.has_breakdown && (
                        <button
                          onClick={() => setBreakdownTodoId(todo.id)}
                          className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Break this down"
                        >
                          <Sparkles className="w-4 h-4" />
                        </button>
                      )}
                      {hasDetails && (
                        <button
                          onClick={() => toggleExpanded(todo.id)}
                          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                          <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      )}
                      <button
                        onClick={() => setSharingTodoId(sharingTodoId === todo.id ? null : todo.id)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(todo.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {sharingTodoId === todo.id && availableSpaces.length > 0 && (
                    <div className="px-4 pb-4 border-t border-slate-100">
                      <p className="text-sm font-medium text-slate-700 mb-2 mt-3">Share to space:</p>
                      <div className="space-y-2">
                        {availableSpaces.map((space) => {
                          const isShared = todo.shared_spaces?.some(s => s.space_id === space.id);
                          return (
                            <button
                              key={space.id}
                              onClick={() => !isShared && handleShareToSpace(todo.id, space.id)}
                              disabled={isShared}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                isShared
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                              }`}
                            >
                              {space.name} {isShared && '(shared)'}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Breakdown Modal */}
        {breakdownTodoId && userId && (
          <TodoBreakdownModal
            isOpen={!!breakdownTodoId}
            onClose={() => setBreakdownTodoId(null)}
            taskTitle={todos.find(t => t.id === breakdownTodoId)?.title || ''}
            taskId={breakdownTodoId}
            userId={userId}
            onBreakdownSaved={handleBreakdownSaved}
          />
        )}
      </div>
    </PlannerShell>
  );
}
