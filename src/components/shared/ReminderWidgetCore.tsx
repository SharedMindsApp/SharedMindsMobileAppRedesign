import { useState, useEffect } from 'react';
import { Bell, Check, Plus, Calendar, Clock, Trash2 } from 'lucide-react';
import type { WidgetRenderMode, WidgetViewMode, ReminderContent } from '../../lib/fridgeCanvasTypes';
import {
  getHouseholdReminders,
  createReminder,
  completeReminder,
  uncompleteReminder,
  deleteReminder
} from '../../lib/reminders';
import type { ReminderData } from '../../lib/behaviourTypes';
import { useAuth } from '../../contexts/AuthContext';
import { useUIPreferences } from '../../contexts/UIPreferencesContext';

type FilterType = 'all' | 'today' | 'week' | 'overdue';

interface ReminderWidgetCoreProps {
  mode: WidgetRenderMode;
  householdId?: string;
  viewMode?: WidgetViewMode;
  content?: ReminderContent;
  onContentChange?: (content: ReminderContent) => void;
}

export function ReminderWidgetCore({
  mode,
  householdId,
  viewMode = 'large',
  content,
  onContentChange
}: ReminderWidgetCoreProps) {
  const { user } = useAuth();
  const { appTheme } = useUIPreferences();
  const isNeonMode = appTheme === 'neon-dark';
  const [reminders, setReminders] = useState<ReminderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [newReminderDate, setNewReminderDate] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('');

  useEffect(() => {
    if (mode === 'mobile' && householdId) {
      loadReminders();
    }
  }, [mode, householdId]);

  const loadReminders = async () => {
    if (!householdId) return;

    setLoading(true);
    try {
      const data = await getHouseholdReminders(householdId, true);
      setReminders(data);
    } catch (err) {
      console.error('Failed to load reminders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async (reminder: ReminderData) => {
    try {
      if (reminder.is_completed) {
        await uncompleteReminder(reminder.id);
      } else {
        await completeReminder(reminder.id);
      }
      await loadReminders();
    } catch (err) {
      console.error('Failed to toggle reminder:', err);
    }
  };

  const handleAddReminder = async () => {
    if (!householdId || !user || !newReminderTitle.trim()) return;

    try {
      await createReminder({
        household_id: householdId,
        title: newReminderTitle,
        description: '',
        reminder_date: newReminderDate || new Date().toISOString().split('T')[0],
        reminder_time: newReminderTime || null,
        assigned_to: [user.id]
      });
      setNewReminderTitle('');
      setNewReminderDate('');
      setNewReminderTime('');
      setShowAddForm(false);
      await loadReminders();
    } catch (err) {
      console.error('Failed to create reminder:', err);
    }
  };

  const handleDeleteReminder = async (reminderId: string) => {
    try {
      await deleteReminder(reminderId);
      await loadReminders();
    } catch (err) {
      console.error('Failed to delete reminder:', err);
    }
  };

  const filterReminders = (reminders: ReminderData[]): ReminderData[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    switch (filter) {
      case 'today':
        return reminders.filter(r => {
          const reminderDate = new Date(r.reminder_date);
          reminderDate.setHours(0, 0, 0, 0);
          return reminderDate.getTime() === today.getTime();
        });
      case 'week':
        return reminders.filter(r => {
          const reminderDate = new Date(r.reminder_date);
          reminderDate.setHours(0, 0, 0, 0);
          return reminderDate >= today && reminderDate <= weekFromNow;
        });
      case 'overdue':
        return reminders.filter(r => {
          const reminderDate = new Date(r.reminder_date);
          reminderDate.setHours(0, 0, 0, 0);
          return reminderDate < today && !r.is_completed;
        });
      default:
        return reminders;
    }
  };

  if (mode === 'fridge') {
    const completed = content?.completed || false;

    if (viewMode === 'icon') {
      return (
        <div className={`w-full h-full ${completed ? 'bg-green-100 border-green-200' : 'bg-rose-100 border-rose-200'} border-2 rounded-2xl flex items-center justify-center`}>
          {completed ? (
            <Check size={32} className="text-green-600" />
          ) : (
            <Bell size={32} className="text-rose-600" />
          )}
        </div>
      );
    }

    if (viewMode === 'mini') {
      return (
        <div className={`w-full h-full ${completed ? 'bg-green-100 border-green-200' : 'bg-rose-100 border-rose-200'} border-2 rounded-2xl p-4 flex flex-col`}>
          <div className="flex items-start justify-between mb-2">
            {completed ? (
              <Check size={18} className="text-green-600" />
            ) : (
              <Bell size={18} className="text-rose-600" />
            )}
            <div className={`w-3 h-3 ${completed ? 'bg-green-400' : 'bg-rose-400'} rounded-full`}></div>
          </div>
          <div className="flex-1">
            <p className={`text-sm text-gray-800 font-medium leading-snug ${completed ? 'line-through opacity-60' : ''}`}>
              {content?.title || 'New reminder'}
            </p>
            {content?.dueDate && (
              <p className="text-xs text-gray-600 mt-1">
                Due: {new Date(content.dueDate).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className={`w-full h-full ${completed ? 'bg-green-100 border-green-200' : 'bg-rose-100 border-rose-200'} border-2 rounded-2xl p-6 flex flex-col`}>
        <div className="flex items-start justify-between mb-4">
          {completed ? (
            <Check size={24} className="text-green-600" />
          ) : (
            <Bell size={24} className="text-rose-600" />
          )}
          <button
            onClick={() => onContentChange?.({ ...content, completed: !completed })}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              completed
                ? 'bg-green-200 text-green-700 hover:bg-green-300'
                : 'bg-rose-200 text-rose-700 hover:bg-rose-300'
            }`}
          >
            {completed ? 'Completed' : 'Mark Done'}
          </button>
        </div>
        <input
          type="text"
          className={`w-full bg-transparent border-none focus:outline-none text-gray-800 font-semibold text-lg mb-3 ${completed ? 'line-through opacity-60' : ''}`}
          placeholder="Reminder title..."
          value={content?.title || ''}
          onChange={(e) => onContentChange?.({ ...content, title: e.target.value })}
        />
        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600 font-medium w-12">Date:</label>
            <input
              type="date"
              className="flex-1 text-xs text-gray-700 bg-white/50 rounded px-2 py-1.5 border border-gray-300 focus:border-rose-400 focus:outline-none"
              value={content?.dueDate || ''}
              onChange={(e) => onContentChange?.({ ...content, dueDate: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600 font-medium w-12">Time:</label>
            <input
              type="time"
              className="flex-1 text-xs text-gray-700 bg-white/50 rounded px-2 py-1.5 border border-gray-300 focus:border-rose-400 focus:outline-none"
              value={content?.time || ''}
              onChange={(e) => onContentChange?.({ ...content, time: e.target.value })}
            />
          </div>
        </div>
        {content?.assignedTo && content.assignedTo.length > 0 && (
          <div className="mt-auto">
            <p className="text-xs text-gray-600 mb-1">Assigned to:</p>
            <div className="flex flex-wrap gap-1">
              {content.assignedTo.map((person, i) => (
                <span key={i} className="text-xs bg-white/60 px-2 py-0.5 rounded-full">
                  {person}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const filteredReminders = filterReminders(reminders);
  const pendingCount = reminders.filter(r => !r.is_completed).length;

  if (!householdId) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <p className="text-gray-600 text-center">Please join a household to use reminders.</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${
      isNeonMode ? 'neon-dark-widget' : 'bg-gray-50'
    }`}>
      <div className="bg-white border-b border-gray-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Reminders</h2>
            <p className="text-sm text-gray-600">{pendingCount} pending</p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto">
          {(['all', 'today', 'week', 'overdue'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === f
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {f === 'all' && 'All'}
              {f === 'today' && 'Today'}
              {f === 'week' && 'This Week'}
              {f === 'overdue' && 'Overdue'}
            </button>
          ))}
        </div>

        {showAddForm && (
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <input
              type="text"
              placeholder="Reminder title..."
              value={newReminderTitle}
              onChange={(e) => setNewReminderTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={newReminderDate}
                onChange={(e) => setNewReminderDate(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="time"
                value={newReminderTime}
                onChange={(e) => setNewReminderTime(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddReminder}
                disabled={!newReminderTitle.trim()}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewReminderTitle('');
                  setNewReminderDate('');
                  setNewReminderTime('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading...</p>
            </div>
          </div>
        ) : filteredReminders.length === 0 ? (
          <div className="text-center py-12">
            <Bell size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium mb-1">No reminders</p>
            <p className="text-sm text-gray-500">Tap + to add one</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredReminders.map((reminder) => {
              const reminderDate = new Date(reminder.reminder_date);
              const isOverdue = reminderDate < new Date() && !reminder.is_completed;

              return (
                <div
                  key={reminder.id}
                  className={`bg-white rounded-lg p-4 border-2 ${
                    reminder.is_completed
                      ? 'border-green-200 bg-green-50'
                      : isOverdue
                      ? 'border-red-200 bg-red-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleToggleComplete(reminder)}
                      className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        reminder.is_completed
                          ? 'bg-green-500 border-green-500'
                          : 'border-gray-300 hover:border-blue-500'
                      }`}
                    >
                      {reminder.is_completed && <Check size={14} className="text-white" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <h3
                        className={`font-semibold text-gray-900 mb-1 ${
                          reminder.is_completed ? 'line-through opacity-60' : ''
                        }`}
                      >
                        {reminder.title}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar size={12} />
                          {reminderDate.toLocaleDateString()}
                        </div>
                        {reminder.reminder_time && (
                          <div className="flex items-center gap-1">
                            <Clock size={12} />
                            {reminder.reminder_time}
                          </div>
                        )}
                        {isOverdue && (
                          <span className="text-red-600 font-semibold">Overdue</span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteReminder(reminder.id)}
                      className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
