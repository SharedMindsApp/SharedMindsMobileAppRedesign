import { CheckSquare, Plus, Share2, Trash2, ChevronDown, ChevronRight, X, Search, ExternalLink, Calendar, Clock, Repeat } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { WidgetViewMode } from '../../../lib/fridgeCanvasTypes';
import * as todosService from '../../../lib/todosService';
import type { PersonalTodo, TodoMicroStep } from '../../../lib/todosService';
import { 
  searchTasks, 
  getRandomSuggestions, 
  getAllCategories,
  type TaskTemplate,
  type TaskCategory,
} from '../../../lib/taskLibrary';
import { 
  findWidgetByType, 
  getWidgetRoute, 
  getAvailableWidgets,
  type WidgetWithLayout,
} from '../../../lib/widgetLinking';
import {
  scheduleTodoOnCalendar,
  unscheduleTodoFromCalendar,
  syncTodoToCalendar,
  isTodoScheduled,
  autoSyncTodosWithDueDates,
} from '../../../lib/todoCalendarSync';
import {
  getRoutines,
  createRoutine,
  updateRoutine,
  deleteRoutine,
  generateTodayTodosFromRoutines,
  getTodayCalendarEvents,
  type TodoRoutine,
} from '../../../lib/todoRoutineService';
import type { PersonalCalendarEvent } from '../../../lib/personalSpaces/calendarService';
import { supabase } from '../../../lib/supabase';

interface TodoCanvasWidgetProps {
  householdId: string;
  viewMode: WidgetViewMode;
}

type TodoFilter = 'active' | 'completed' | 'all' | 'today';

export function TodoCanvasWidget({ householdId, viewMode }: TodoCanvasWidgetProps) {
  const navigate = useNavigate();
  const [todos, setTodos] = useState<PersonalTodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [showAddInput, setShowAddInput] = useState(false);
  const [personalSpaceId, setPersonalSpaceId] = useState<string | null>(null);
  const [filter, setFilter] = useState<TodoFilter>('today'); // Default to today view
  
  // Micro-steps state
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [stepsByTodoId, setStepsByTodoId] = useState<Record<string, TodoMicroStep[]>>({});
  const [loadingSteps, setLoadingSteps] = useState<Set<string>>(new Set());
  const [newStepTitles, setNewStepTitles] = useState<Record<string, string>>({});
  
  // Suggested tasks state
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  const [addedSuggestions, setAddedSuggestions] = useState<Set<string>>(new Set());
  const [suggestedTasks, setSuggestedTasks] = useState<TaskTemplate[]>([]);
  
  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | undefined>(undefined);
  const [searchResults, setSearchResults] = useState<TaskTemplate[]>([]);
  
  // Template prompt state
  const [templatePromptTodoId, setTemplatePromptTodoId] = useState<string | null>(null);
  const [templatePromptTemplate, setTemplatePromptTemplate] = useState<TaskTemplate | null>(null);
  
  // Widget linking state
  const [availableWidgets, setAvailableWidgets] = useState<Map<string, WidgetWithLayout>>(new Map());
  const [widgetLinksByTodoId, setWidgetLinksByTodoId] = useState<Record<string, { widgetId: string; widgetType: string; label: string }>>({});
  
  // Daily routine and today view state
  const [routines, setRoutines] = useState<TodoRoutine[]>([]);
  const [todayEvents, setTodayEvents] = useState<PersonalCalendarEvent[]>([]);
  const [showRoutineModal, setShowRoutineModal] = useState(false);
  const [newRoutineTitle, setNewRoutineTitle] = useState('');
  const [newRoutineTime, setNewRoutineTime] = useState('09:00');
  const [newRoutineDuration, setNewRoutineDuration] = useState(30);
  const [routineSuggestions, setRoutineSuggestions] = useState<TaskTemplate[]>([]);
  const [showRoutineSuggestions, setShowRoutineSuggestions] = useState(false);
  const routineInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPersonalSpace();
    // Load random suggestions on mount
    setSuggestedTasks(getRandomSuggestions(5));
  }, []);

  // Load available widgets when personal space is loaded
  useEffect(() => {
    if (personalSpaceId) {
      loadAvailableWidgets();
    }
  }, [personalSpaceId]);

  // Update widget links when todos or available widgets change
  useEffect(() => {
    if (todos.length > 0 && personalSpaceId) {
      // Always try to update links, even if widgets not loaded yet
      updateWidgetLinks();
    }
  }, [todos, availableWidgets, personalSpaceId]);

  // Update search results when query or category changes
  useEffect(() => {
    if (showSearch) {
      const results = searchTasks(searchQuery, selectedCategory);
      setSearchResults(results);
    }
  }, [searchQuery, selectedCategory, showSearch]);

  useEffect(() => {
    if (personalSpaceId) {
      loadTodos();
      loadRoutines();
      loadTodayEvents();
      // Auto-sync existing todos with due dates to calendar
      autoSyncTodosWithDueDates().catch(err => {
        console.warn('Failed to auto-sync todos with due dates:', err);
      });
    }
  }, [personalSpaceId]);

  // Load today's data when filter is 'today'
  useEffect(() => {
    if (filter === 'today' && personalSpaceId) {
      loadTodayEvents();
      generateTodayRoutineTodos();
    }
  }, [filter, personalSpaceId]);

  const loadPersonalSpace = async () => {
    try {
      const spaceId = await todosService.getPersonalSpace();
      if (spaceId) {
        console.log('Personal space loaded:', spaceId);
        setPersonalSpaceId(spaceId);
      } else {
        console.warn('Personal space not found, cannot create todos');
        // Don't fallback - user needs a personal space
        setPersonalSpaceId(null);
      }
    } catch (error) {
      console.error('Error loading personal space:', error);
      setPersonalSpaceId(null);
    }
  };

  const loadTodos = async () => {
    // For personal todos, pass null (household_id IS NULL)
    // personalSpaceId is only used for verification, not for querying
    try {
      const data = await todosService.getTodos(null); // Personal todos have household_id = NULL
      setTodos(data);
      
      // Update widget links after loading todos
      if (personalSpaceId && data.length > 0) {
        setTimeout(() => updateWidgetLinks(), 100);
      }
    } catch (error) {
      console.error('Error loading todos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (todo: PersonalTodo) => {
    // TODO: Habit → Task Projection - Task completion sync
    // If this is a habit-derived task, sync is handled automatically in updateTodo
    // The syncTaskCompletionToHabit is called in todosService.updateTodo
    // No additional action needed here - the sync is transparent to the user
    try {
      await todosService.updateTodo(todo.id, { completed: !todo.completed });
      await loadTodos();
      
      // Sync completion to calendar if linked
      const updatedTodo = todos.find(t => t.id === todo.id);
      if (updatedTodo?.calendar_event_id) {
        await syncTodoToCalendar(updatedTodo).catch(err => {
          console.error('Error syncing todo to calendar:', err);
        });
      }
    } catch (error) {
      console.error('Error updating todo:', error);
    }
  };

  // Check if a task title matches a template from the library
  const findMatchingTemplate = (title: string): TaskTemplate | null => {
    const lowerTitle = title.toLowerCase();
    // Search for matching task in library
    const matches = searchTasks(lowerTitle);
    // Return first match if found
    return matches.length > 0 ? matches[0] : null;
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim()) return;

    // Ensure we have a personal space ID
    let targetHouseholdId = personalSpaceId;
    
    if (!targetHouseholdId) {
      // Try to get personal space one more time
      try {
        const spaceId = await todosService.getPersonalSpace();
        if (spaceId) {
          targetHouseholdId = spaceId;
          setPersonalSpaceId(spaceId);
        } else {
          alert('Personal space not found. Please refresh the page.');
          return;
        }
      } catch (error) {
        console.error('Error getting personal space:', error);
        alert('Could not find your personal space. Please refresh the page.');
        return;
      }
    }

    try {
      // Personal todos: householdId must be null (personal spaces are NOT households)
      const newTodo = await todosService.createTodo({
        householdId: null, // Personal todos must have household_id = NULL
        title: newTodoTitle,
        spaceMode: 'personal', // Personal todos only require user_id = auth.uid()
      });
      
      setNewTodoTitle('');
      setShowAddInput(false);
      await loadTodos();
      
      // Update widget links after adding new todo
      if (personalSpaceId) {
        setTimeout(() => updateWidgetLinks(), 100);
      }
      
      // Check if title matches a template and show prompt (only if todo doesn't already have steps)
      const matchingTemplate = findMatchingTemplate(newTodoTitle);
      if (matchingTemplate && !newTodo.has_breakdown) {
        setTemplatePromptTodoId(newTodo.id);
        setTemplatePromptTemplate(matchingTemplate);
      }
    } catch (error) {
      console.error('Error creating todo:', error);
      // Show user-friendly error
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('Failed to create todo. Please try again.');
      }
    }
  };

  const handleAddSuggestedTask = async (taskTemplate: TaskTemplate) => {
    try {
      const newTodo = await todosService.createTodo({
        householdId: null,
        title: taskTemplate.title,
        spaceMode: 'personal',
      });
      
      // Mark suggestion as added
      setAddedSuggestions(prev => new Set(prev).add(taskTemplate.id));
      
      await loadTodos();
      
      // Update widget links after adding
      if (personalSpaceId) {
        setTimeout(() => updateWidgetLinks(), 100);
      }
      
      // Auto-apply template if it has steps
      if (taskTemplate.steps.length > 0 && !newTodo.has_breakdown) {
        await handleApplyTemplate(newTodo.id, taskTemplate);
      }
    } catch (error) {
      console.error('Error adding suggested task:', error);
    }
  };

  const handleDismissSuggestion = (suggestionId: string) => {
    setDismissedSuggestions(prev => new Set(prev).add(suggestionId));
  };

  const handleApplyTemplate = async (todoId: string, template: TaskTemplate) => {
    if (!template || !template.steps || template.steps.length === 0) return;

    try {
      const steps = await todosService.applyBreakdownTemplate(todoId, template.steps);
      
      // Update local cache
      setStepsByTodoId(prev => ({ ...prev, [todoId]: steps }));
      
      // Auto-expand the todo
      setExpandedIds(prev => new Set(prev).add(todoId));
      
      // Close prompt
      setTemplatePromptTodoId(null);
      setTemplatePromptTemplate(null);
    } catch (error) {
      console.error('Error applying template:', error);
    }
  };

  const handleDismissTemplatePrompt = () => {
    setTemplatePromptTodoId(null);
    setTemplatePromptTemplate(null);
  };

  // Widget linking functions
  const loadAvailableWidgets = async () => {
    if (!personalSpaceId) return;
    
    try {
      const widgets = await getAvailableWidgets(personalSpaceId);
      // Convert to Map with string keys for easier lookup
      const widgetMap = new Map<string, WidgetWithLayout>();
      widgets.forEach((widget, type) => {
        widgetMap.set(type, widget);
      });
      setAvailableWidgets(widgetMap);
    } catch (error) {
      console.error('Error loading available widgets:', error);
    }
  };

  const updateWidgetLinks = async () => {
    if (!personalSpaceId) return;

    const links: Record<string, { widgetId: string; widgetType: string; label: string }> = {};

    for (const todo of todos) {
      // Check if todo title matches a task template with widget link
      const matchingTemplate = findMatchingTemplate(todo.title);
      if (matchingTemplate?.linkedWidgetType) {
        // Check if widget is already in our cache
        const cachedWidget = availableWidgets.get(matchingTemplate.linkedWidgetType);
        if (cachedWidget) {
          links[todo.id] = {
            widgetId: cachedWidget.id,
            widgetType: matchingTemplate.linkedWidgetType,
            label: matchingTemplate.linkedWidgetLabel || matchingTemplate.linkedWidgetType,
          };
        } else {
          // Try to find it (might not be loaded yet)
          const widget = await findWidgetByType(personalSpaceId, matchingTemplate.linkedWidgetType);
          if (widget) {
            // Update cache
            setAvailableWidgets(prev => new Map(prev).set(matchingTemplate.linkedWidgetType, widget));
            links[todo.id] = {
              widgetId: widget.id,
              widgetType: matchingTemplate.linkedWidgetType,
              label: matchingTemplate.linkedWidgetLabel || matchingTemplate.linkedWidgetType,
            };
          }
        }
      }
    }

    setWidgetLinksByTodoId(links);
  };

  const handleNavigateToWidget = (todoId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent todo toggle
    const link = widgetLinksByTodoId[todoId];
    if (link && personalSpaceId) {
      const route = getWidgetRoute(personalSpaceId, link.widgetId);
      if (route) {
        navigate(route);
      }
    }
  };

  // Calendar sync functions
  const handleScheduleTodo = async (todo: PersonalTodo) => {
    try {
      // Default to today at 2 PM, or use due_date if available
      const now = new Date();
      const startDate = todo.due_date ? new Date(todo.due_date) : now;
      startDate.setHours(14, 0, 0, 0); // 2 PM
      
      const endDate = new Date(startDate);
      endDate.setHours(15, 0, 0, 0); // 1 hour duration

      await scheduleTodoOnCalendar(
        todo,
        startDate.toISOString(),
        endDate.toISOString(),
        false
      );

      // Reload todos to get updated calendar_event_id
      await loadTodos();
    } catch (error) {
      console.error('Error scheduling todo:', error);
      alert('Failed to schedule todo on calendar. Please try again.');
    }
  };

  const handleUnscheduleTodo = async (todo: PersonalTodo) => {
    try {
      await unscheduleTodoFromCalendar(todo);
      await loadTodos();
    } catch (error) {
      console.error('Error unscheduling todo:', error);
      alert('Failed to remove from calendar. Please try again.');
    }
  };

  const handleNavigateToCalendar = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (personalSpaceId) {
      navigate(`/spaces/${personalSpaceId}/app/calendar`);
    } else {
      navigate('/calendar/personal');
    }
  };

  // Routine management functions
  const loadRoutines = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const routinesData = await getRoutines(user.id);
      setRoutines(routinesData);
    } catch (error) {
      console.error('Error loading routines:', error);
    }
  };

  const loadTodayEvents = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const events = await getTodayCalendarEvents(user.id);
      setTodayEvents(events);
    } catch (error) {
      console.error('Error loading today events:', error);
    }
  };

  const generateTodayRoutineTodos = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      await generateTodayTodosFromRoutines(user.id);
      await loadTodos(); // Reload todos to show newly generated ones
    } catch (error) {
      console.error('Error generating today todos from routines:', error);
    }
  };

  const handleCreateRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoutineTitle.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      await createRoutine(user.id, newRoutineTitle, newRoutineTime, newRoutineDuration);
      setNewRoutineTitle('');
      setNewRoutineTime('09:00');
      setNewRoutineDuration(30);
      setShowRoutineModal(false);
      setShowRoutineSuggestions(false);
      setRoutineSuggestions([]);
      await loadRoutines();
      await generateTodayRoutineTodos();
    } catch (error) {
      console.error('Error creating routine:', error);
      alert('Failed to create routine. Please try again.');
    }
  };

  const handleDeleteRoutine = async (routineId: string) => {
    try {
      await deleteRoutine(routineId);
      await loadRoutines();
      await loadTodos(); // Reload to remove routine-generated todos
    } catch (error) {
      console.error('Error deleting routine:', error);
      alert('Failed to delete routine. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await todosService.deleteTodo(id);
      // Clean up expanded state and steps cache
      setExpandedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setStepsByTodoId(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      await loadTodos();
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  };

  // Micro-steps handlers
  const toggleExpanded = async (todoId: string) => {
    const isExpanded = expandedIds.has(todoId);
    
    if (isExpanded) {
      // Collapse: just remove from expanded set
      setExpandedIds(prev => {
        const next = new Set(prev);
        next.delete(todoId);
        return next;
      });
    } else {
      // Expand: add to expanded set and load steps if not cached
      setExpandedIds(prev => new Set(prev).add(todoId));
      
      if (!stepsByTodoId[todoId]) {
        await loadTodoSteps(todoId);
      }
    }
  };

  const loadTodoSteps = async (todoId: string) => {
    setLoadingSteps(prev => new Set(prev).add(todoId));
    try {
      const steps = await todosService.getTodoSteps(todoId);
      setStepsByTodoId(prev => ({ ...prev, [todoId]: steps }));
    } catch (error) {
      console.error('Error loading steps:', error);
    } finally {
      setLoadingSteps(prev => {
        const next = new Set(prev);
        next.delete(todoId);
        return next;
      });
    }
  };

  const handleToggleStep = async (stepId: string, completed: boolean) => {
    try {
      await todosService.toggleTodoStep(stepId, !completed);
      // Update local cache
      setStepsByTodoId(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(todoId => {
          updated[todoId] = updated[todoId].map(step =>
            step.id === stepId ? { ...step, completed: !completed, completed_at: !completed ? new Date().toISOString() : undefined } : step
          );
        });
        return updated;
      });
    } catch (error) {
      console.error('Error toggling step:', error);
    }
  };

  const handleAddStep = async (todoId: string, e: React.FormEvent) => {
    e.preventDefault();
    const title = newStepTitles[todoId]?.trim();
    if (!title) return;

    try {
      const newStep = await todosService.createTodoStep(todoId, title);
      // Update local cache
      setStepsByTodoId(prev => ({
        ...prev,
        [todoId]: [...(prev[todoId] || []), newStep].sort((a, b) => a.order_index - b.order_index),
      }));
      // Clear input
      setNewStepTitles(prev => {
        const next = { ...prev };
        delete next[todoId];
        return next;
      });
    } catch (error) {
      console.error('Error adding step:', error);
    }
  };

  const handleDeleteStep = async (stepId: string, todoId: string) => {
    try {
      await todosService.deleteTodoStep(stepId);
      // Update local cache
      setStepsByTodoId(prev => ({
        ...prev,
        [todoId]: (prev[todoId] || []).filter(step => step.id !== stepId),
      }));
    } catch (error) {
      console.error('Error deleting step:', error);
    }
  };

  const activeTodos = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t => t.completed);
  const completedCount = completedTodos.length;

  // Get today's date for filtering
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  // Filter todos based on current filter
  const filteredTodos = (() => {
    switch (filter) {
      case 'active':
        return activeTodos;
      case 'completed':
        return completedTodos;
      case 'all':
        return todos;
      case 'today':
        // Today view: todos due today OR scheduled for today
        return todos.filter(t => {
          // Check if due today
          if (t.due_date === todayStr) return true;
          // Check if scheduled for today (has calendar_event_id and event is today)
          if (t.calendar_event_id) {
            const event = todayEvents.find(e => e.id === t.calendar_event_id);
            if (event) {
              const eventDate = new Date(event.startAt);
              return eventDate >= today && eventDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
            }
          }
          return false;
        }).sort((a, b) => {
          // Sort by time if scheduled, otherwise by order_index
          const aEvent = todayEvents.find(e => e.id === a.calendar_event_id);
          const bEvent = todayEvents.find(e => e.id === b.calendar_event_id);
          if (aEvent && bEvent) {
            return new Date(aEvent.startAt).getTime() - new Date(bEvent.startAt).getTime();
          }
          if (aEvent) return -1;
          if (bEvent) return 1;
          return a.order_index - b.order_index;
        });
      default:
        return activeTodos;
    }
  })();

  if (viewMode === 'micro') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <CheckSquare className="w-8 h-8 text-emerald-600 mx-auto mb-1" />
          <div className="text-xs font-medium text-slate-700">{activeTodos.length}</div>
          <div className="text-xs text-slate-500">tasks</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <p className="text-slate-500 text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-emerald-600" />
          <h3 className="font-semibold text-slate-800">To-Do List</h3>
        </div>
        <div className="flex items-center gap-1">
          {/* Filter buttons */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setFilter('active')}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                filter === 'active'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                filter === 'completed'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Completed
            </button>
            <button
              onClick={() => setFilter('today')}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1 ${
                filter === 'today'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <Calendar className="w-3 h-3" />
              Today
            </button>
            {completedCount > 0 && (
              <button
                onClick={() => setFilter('all')}
                className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                  filter === 'all'
                    ? 'bg-white text-emerald-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                All
              </button>
            )}
          </div>
          <button
            onClick={() => setShowAddInput(!showAddInput)}
            className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showAddInput && (
        <form onSubmit={handleAdd} className="mb-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={newTodoTitle}
              onChange={(e) => setNewTodoTitle(e.target.value)}
              placeholder="New task..."
              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
              autoFocus
            />
            <button
              type="submit"
              className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
            >
              Add
            </button>
          </div>
        </form>
      )}

      {todos.length > 0 && filter !== 'completed' && (
        <div className="text-xs text-emerald-700 mb-3 bg-emerald-50 px-2 py-1 rounded">
          {completedCount} of {todos.length} completed
        </div>
      )}

      {/* Suggested Tasks Section - Only show for active filter */}
      {filter === 'active' && (
        <div className="mb-3">
          {/* Search toggle */}
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-slate-500">Suggested for you</p>
            <button
              onClick={() => {
                setShowSearch(!showSearch);
                if (!showSearch) {
                  setSearchResults(searchTasks(''));
                }
              }}
              className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-700 transition-colors"
              title="Search tasks"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Search interface */}
          {showSearch && (
            <div className="mb-3 p-2 bg-slate-50 rounded-lg border border-slate-200">
              <div className="mb-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tasks..."
                  className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-emerald-200 focus:border-emerald-400"
                  autoFocus
                />
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                <button
                  onClick={() => setSelectedCategory(undefined)}
                  className={`px-2 py-0.5 text-xs rounded transition-colors ${
                    !selectedCategory
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-300'
                  }`}
                >
                  All
                </button>
                {getAllCategories().map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-2 py-0.5 text-xs rounded transition-colors capitalize ${
                      selectedCategory === category
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white text-slate-600 border border-slate-300'
                    }`}
                  >
                    {category.replace('-', ' ')}
                  </button>
                ))}
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {searchResults.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-2">No tasks found</p>
                ) : (
                  searchResults.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => {
                        handleAddSuggestedTask(task);
                        setShowSearch(false);
                        setSearchQuery('');
                      }}
                      className="w-full text-left px-2 py-1.5 hover:bg-white rounded text-xs text-slate-700 transition-colors flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span>{task.emoji} {task.title}</span>
                        {task.linkedWidgetType && (
                          <span className="text-emerald-600 text-xs flex items-center gap-0.5">
                            <ExternalLink className="w-2.5 h-2.5" />
                            <span className="hidden sm:inline">{task.linkedWidgetLabel || task.linkedWidgetType}</span>
                          </span>
                        )}
                      </div>
                      <span className="text-slate-400 text-xs opacity-0 group-hover:opacity-100">
                        {task.estimatedTime || task.difficulty}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Calendar link */}
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={handleNavigateToCalendar}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Calendar className="w-4 h-4" />
              <span>View Calendar</span>
            </button>
          </div>

          {/* Quick suggestions */}
          {!showSearch && suggestedTasks.filter(
            task => 
              !dismissedSuggestions.has(task.id) && 
              !addedSuggestions.has(task.id)
          ).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {suggestedTasks.filter(
                task => 
                  !dismissedSuggestions.has(task.id) && 
                  !addedSuggestions.has(task.id)
              ).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-1 px-2 py-1 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs text-slate-700 transition-colors group"
                >
                  <span className="flex-1">{task.title}</span>
                  {task.linkedWidgetType && (
                    <span className="text-emerald-600 text-xs flex items-center gap-0.5">
                      <ExternalLink className="w-2.5 h-2.5" />
                    </span>
                  )}
                  <button
                    onClick={() => handleAddSuggestedTask(task)}
                    className="p-0.5 hover:bg-emerald-100 rounded text-emerald-600 transition-colors"
                    title="Add to list"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDismissSuggestion(task.id)}
                    className="p-0.5 hover:bg-slate-200 rounded text-slate-400 opacity-0 group-hover:opacity-100 transition-all"
                    title="Dismiss"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {/* Today View: Show calendar events and todos together */}
        {filter === 'today' && (
          <div className="mb-4 space-y-3">
            {/* Calendar Events Section */}
            {todayEvents.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-semibold text-slate-700">Today's Events</h3>
                </div>
                <div className="space-y-1.5">
                  {todayEvents
                    .filter(e => e.event_type !== 'task' || !todos.find(t => t.calendar_event_id === e.id))
                    .map((event) => {
                      const eventTime = new Date(event.startAt);
                      const timeStr = eventTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                      
                      return (
                        <div
                          key={event.id}
                          className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-100"
                        >
                          <Clock className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-blue-900">{event.title}</p>
                            <p className="text-xs text-blue-600">{timeStr}</p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Routines Section */}
            {routines.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Repeat className="w-4 h-4 text-purple-600" />
                    <h3 className="text-xs font-semibold text-slate-700">Daily Routines</h3>
                  </div>
                  <button
                    onClick={() => setShowRoutineModal(true)}
                    className="text-xs text-purple-600 hover:text-purple-700"
                  >
                    + Add
                  </button>
                </div>
                <div className="space-y-1.5">
                  {routines.map((routine) => (
                    <div
                      key={routine.id}
                      className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg border border-purple-100 group"
                    >
                      <Clock className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-purple-900">{routine.title}</p>
                        <p className="text-xs text-purple-600">{routine.time}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteRoutine(routine.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-purple-400 hover:text-red-600 rounded transition-all"
                        title="Delete routine"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add Routine Button */}
            {routines.length === 0 && (
              <button
                onClick={() => setShowRoutineModal(true)}
                className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-purple-200 rounded-lg text-purple-600 hover:border-purple-300 hover:bg-purple-50 transition-colors"
              >
                <Repeat className="w-4 h-4" />
                <span className="text-xs font-medium">Add Daily Routine</span>
              </button>
            )}
          </div>
        )}

        {filteredTodos.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {filter === 'today'
                ? 'Nothing scheduled for today'
                : filter === 'active' && completedCount === 0
                ? 'No tasks yet'
                : filter === 'active'
                ? 'All tasks completed!'
                : filter === 'completed'
                ? 'No completed tasks'
                : 'No tasks yet'}
            </p>
            {filter === 'today' && (
              <button
                onClick={() => setShowRoutineModal(true)}
                className="mt-3 text-xs text-purple-600 hover:text-purple-700"
              >
                Add a daily routine
              </button>
            )}
          </div>
        ) : (
          filteredTodos.map((todo) => {
            const isExpanded = expandedIds.has(todo.id);
            const steps = stepsByTodoId[todo.id] || [];
            const stepsLoading = loadingSteps.has(todo.id);
            const completedSteps = steps.filter(s => s.completed).length;
            const hasSteps = steps.length > 0;

            return (
              <div
                key={todo.id}
                className={`group rounded-lg transition-colors ${
                  todo.completed ? 'opacity-75' : ''
                }`}
              >
                {/* Main todo row */}
                <div className="flex items-start gap-2 p-2 hover:bg-slate-50 rounded-lg">
                  <button
                    onClick={() => handleToggle(todo)}
                    title={todo.is_habit_derived ? 'Habit task - completing this checks in the habit' : undefined}
                    className={`flex-shrink-0 w-5 h-5 rounded border-2 transition-colors mt-0.5 flex items-center justify-center ${
                      todo.completed
                        ? 'bg-emerald-500 border-emerald-500 hover:border-emerald-600'
                        : 'border-slate-300 hover:border-emerald-400'
                    }`}
                  >
                    {todo.completed && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {todo.is_habit_derived && (
                        <Repeat size={14} className="text-blue-500 flex-shrink-0" title="Habit task" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm break-words ${
                            todo.completed
                              ? 'text-slate-500 line-through'
                              : 'text-slate-700'
                          }`}
                        >
                          {todo.title}
                        </p>
                        {/* Show time in today view if scheduled */}
                        {filter === 'today' && todo.calendar_event_id && !todo.completed && (() => {
                          const event = todayEvents.find(e => e.id === todo.calendar_event_id);
                          if (event) {
                            const eventTime = new Date(event.startAt);
                            const timeStr = eventTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                            return (
                              <p className="text-xs text-blue-600 mt-0.5 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {timeStr}
                              </p>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      {/* Calendar schedule button */}
                      {!todo.completed && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isTodoScheduled(todo)) {
                              handleUnscheduleTodo(todo);
                            } else {
                              handleScheduleTodo(todo);
                            }
                          }}
                          className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded transition-colors ${
                            isTodoScheduled(todo)
                              ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                          }`}
                          title={isTodoScheduled(todo) ? 'Remove from calendar' : 'Schedule on calendar'}
                        >
                          <Calendar className={`w-3 h-3 ${isTodoScheduled(todo) ? 'fill-current' : ''}`} />
                          <span className="hidden sm:inline">
                            {isTodoScheduled(todo) ? 'Scheduled' : 'Schedule'}
                          </span>
                        </button>
                      )}
                      {/* Widget link button */}
                      {widgetLinksByTodoId[todo.id] && !todo.completed && (
                        <button
                          onClick={(e) => handleNavigateToWidget(todo.id, e)}
                          className="flex items-center gap-1 px-2 py-0.5 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                          title={`Open ${widgetLinksByTodoId[todo.id].label}`}
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span className="hidden sm:inline">{widgetLinksByTodoId[todo.id].label}</span>
                        </button>
                      )}
                      {/* Expand/collapse button and step summary */}
                      <button
                        onClick={() => toggleExpanded(todo.id)}
                        className="flex items-center gap-1 px-2 py-0.5 text-xs text-slate-500 hover:text-slate-700 rounded transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ChevronRight className="w-3 h-3" />
                        )}
                        {hasSteps && (
                          <span className="text-xs">
                            Steps {completedSteps}/{steps.length}
                          </span>
                        )}
                      </button>
                    </div>
                    {todo.shared_spaces && todo.shared_spaces.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <Share2 className="w-3 h-3 text-blue-500" />
                        <span className="text-xs text-blue-600">
                          Shared
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Delete button - hidden for habit-derived tasks */}
                  {!todo.is_habit_derived && (
                    <button
                      onClick={() => handleDelete(todo.id)}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 rounded transition-all"
                      title="Delete task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {todo.is_habit_derived && (
                    <span 
                      className="flex-shrink-0 p-1 text-blue-500" 
                      title="Habit task - managed by habit system"
                    >
                      <Repeat className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>

                {/* Template prompt - shows below todo title when template matches and no steps exist */}
                {templatePromptTodoId === todo.id && 
                 templatePromptTemplate && 
                 !hasSteps && (
                  <div className="ml-7 mr-2 mt-1 mb-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-800 mb-2">
                      Want to make this easier? We can break it into small steps.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApplyTemplate(todo.id, templatePromptTemplate)}
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
                      >
                        Yes, add steps
                      </button>
                      <button
                        onClick={handleDismissTemplatePrompt}
                        className="px-2 py-1 text-xs bg-white text-slate-600 border border-slate-300 rounded hover:bg-slate-50 transition-colors"
                      >
                        No thanks
                      </button>
                    </div>
                  </div>
                )}

                {/* Expanded steps view */}
                {isExpanded && (
                  <div className="pl-7 pr-2 pb-2 space-y-1">
                    {stepsLoading ? (
                      <div className="text-xs text-slate-400 py-2">Loading steps...</div>
                    ) : steps.length === 0 ? (
                      <div className="text-xs text-slate-400 py-2">No steps yet</div>
                    ) : (
                      <div className="space-y-1">
                        {steps.map((step) => (
                          <div
                            key={step.id}
                            className="group/step flex items-start gap-2 py-1"
                          >
                            <button
                              onClick={() => handleToggleStep(step.id, step.completed)}
                              className={`flex-shrink-0 w-4 h-4 rounded border transition-colors mt-0.5 flex items-center justify-center ${
                                step.completed
                                  ? 'bg-emerald-500 border-emerald-500 hover:border-emerald-600'
                                  : 'border-slate-300 hover:border-emerald-400'
                              }`}
                            >
                              {step.completed && (
                                <svg
                                  className="w-2.5 h-2.5 text-white"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  strokeWidth={3}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              )}
                            </button>
                            <p
                              className={`text-xs flex-1 break-words ${
                                step.completed
                                  ? 'text-slate-400 line-through'
                                  : 'text-slate-600'
                              }`}
                            >
                              {step.title}
                            </p>
                            <button
                              onClick={() => handleDeleteStep(step.id, todo.id)}
                              className="flex-shrink-0 opacity-0 group-hover/step:opacity-100 p-0.5 text-slate-400 hover:text-red-600 rounded transition-all"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Add step input */}
                    <form
                      onSubmit={(e) => handleAddStep(todo.id, e)}
                      className="mt-2"
                    >
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={newStepTitles[todo.id] || ''}
                          onChange={(e) =>
                            setNewStepTitles(prev => ({
                              ...prev,
                              [todo.id]: e.target.value,
                            }))
                          }
                          placeholder="Add step..."
                          className="flex-1 px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-emerald-200 focus:border-emerald-400"
                          autoFocus={false}
                        />
                        <button
                          type="submit"
                          className="px-2 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-xs font-medium"
                        >
                          Add
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Routine Modal */}
      {showRoutineModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Add Daily Routine</h3>
              <button
                onClick={() => {
                  setShowRoutineModal(false);
                  setNewRoutineTitle('');
                  setNewRoutineTime('09:00');
                  setNewRoutineDuration(30);
                  setShowRoutineSuggestions(false);
                  setRoutineSuggestions([]);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateRoutine} className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Task Name
                </label>
                <input
                  ref={routineInputRef}
                  type="text"
                  value={newRoutineTitle}
                  onChange={(e) => {
                    const value = e.target.value;
                    setNewRoutineTitle(value);
                    if (value.trim()) {
                      const suggestions = searchTasks(value).slice(0, 8);
                      setRoutineSuggestions(suggestions);
                      setShowRoutineSuggestions(true);
                    } else {
                      setRoutineSuggestions([]);
                      setShowRoutineSuggestions(false);
                    }
                  }}
                  onFocus={() => {
                    if (newRoutineTitle.trim()) {
                      const suggestions = searchTasks(newRoutineTitle).slice(0, 8);
                      setRoutineSuggestions(suggestions);
                      setShowRoutineSuggestions(true);
                    } else {
                      // Show popular suggestions when empty
                      const popular = getRandomSuggestions(8);
                      setRoutineSuggestions(popular);
                      setShowRoutineSuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    // Delay hiding to allow clicks on suggestions
                    setTimeout(() => setShowRoutineSuggestions(false), 200);
                  }}
                  placeholder="Type to search or select from suggestions..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
                {/* Auto-complete Suggestions Dropdown */}
                {showRoutineSuggestions && routineSuggestions.length > 0 && (
                  <div className="absolute z-[60] w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {routineSuggestions.map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onMouseDown={(e) => {
                          // Prevent input blur before click
                          e.preventDefault();
                        }}
                        onClick={() => {
                          setNewRoutineTitle(`${task.emoji} ${task.title}`);
                          setShowRoutineSuggestions(false);
                          routineInputRef.current?.blur();
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-emerald-50 active:bg-emerald-100 transition-colors flex items-center gap-2 border-b border-slate-100 last:border-b-0 min-h-[44px]"
                      >
                        <span className="text-lg flex-shrink-0">{task.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-900 truncate">
                            {task.title}
                          </div>
                          {task.estimatedTime && (
                            <div className="text-xs text-slate-500">
                              {task.estimatedTime}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={newRoutineTime}
                    onChange={(e) => setNewRoutineTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Duration (min)
                  </label>
                  <input
                    type="number"
                    value={newRoutineDuration}
                    onChange={(e) => setNewRoutineDuration(parseInt(e.target.value) || 30)}
                    min="5"
                    max="1440"
                    step="5"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                >
                  Add Routine
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRoutineModal(false);
                    setNewRoutineTitle('');
                    setNewRoutineTime('09:00');
                    setNewRoutineDuration(30);
                    setShowRoutineSuggestions(false);
                    setRoutineSuggestions([]);
                  }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
