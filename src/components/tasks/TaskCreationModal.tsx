/**
 * TaskCreationModal - Modal for creating standalone tasks
 * 
 * Lightweight form for creating tasks that are not linked to events.
 */

import { useState, useEffect } from 'react';
import { X, Calendar, Loader2, AlertCircle, UserPlus, Bell, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { BottomSheet } from '../shared/BottomSheet';
import {
  createStandaloneTask,
  type CreateStandaloneTaskInput,
} from '../../lib/personalSpaces/eventTasksService';
import { TagInput } from '../tags/TagInput';
import { getUserTags, createTag, addTagsToEntity } from '../../lib/tags/tagService';
import { useAuth } from '../../contexts/AuthContext';
import { ReminderSelector } from '../reminders/ReminderSelector';
import { createReminder, formatReminderOffset } from '../../lib/reminders/reminderService';

interface TaskCreationModalProps {
  userId: string;
  initialDate?: string; // ISO date string (YYYY-MM-DD)
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function TaskCreationModal({
  userId,
  initialDate,
  isOpen,
  onClose,
  onSaved,
}: TaskCreationModalProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showDelegate, setShowDelegate] = useState(false);
  const [delegatedTo, setDelegatedTo] = useState<string | null>(null);
  
  // Tags state
  const [tagNames, setTagNames] = useState<string[]>([]);
  const { user } = useAuth();

  // Reminders state
  const [pendingReminders, setPendingReminders] = useState<Array<{
    offset_minutes: number;
    notify_owner: boolean;
    notify_attendees: boolean;
  }>>([]);
  const [remindersExpanded, setRemindersExpanded] = useState(false);
  const [customReminderValue, setCustomReminderValue] = useState('');
  const [customReminderUnit, setCustomReminderUnit] = useState<'minutes' | 'hours' | 'days'>('minutes');
  const [showCustomReminderInput, setShowCustomReminderInput] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Helper: Get default start time (next hour on the hour)
  const getDefaultStartTime = (): string => {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0);
    return nextHour.toTimeString().slice(0, 5); // HH:mm format
  };

  // Initialize date from prop or default to today
  // For new tasks, set default start time to next hour on the hour
  useEffect(() => {
    if (initialDate) {
      setDate(initialDate);
    } else {
      const today = new Date();
      setDate(today.toISOString().split('T')[0]);
    }
    // Set default start time to next hour on the hour for new tasks
    if (isOpen && !startTime) {
      setStartTime(getDefaultStartTime());
    }
  }, [initialDate, isOpen, startTime]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setStartTime('');
      setDurationMinutes(null);
      setError(null);
      setShowDelegate(false);
      setDelegatedTo(null);
      setPendingReminders([]);
      setRemindersExpanded(false);
      setShowCustomReminderInput(false);
      setCustomReminderValue('');
      if (initialDate) {
        setDate(initialDate);
      } else {
        const today = new Date();
        setDate(today.toISOString().split('T')[0]);
      }
    }
  }, [isOpen, initialDate]);

  // Helper function to link tags to task
  const linkTagsToTask = async (ownerUserId: string, taskId: string, tagNames: string[]) => {
    if (!tagNames || tagNames.length === 0 || !user) return;

    try {
      // Get or create tags
      const userTagsList = await getUserTags(ownerUserId);
      const tagIds: string[] = [];

      for (const tagName of tagNames) {
        const normalizedName = tagName.trim().toLowerCase();
        const existingTag = userTagsList.find(t => t.name.toLowerCase() === normalizedName);
        
        if (existingTag) {
          tagIds.push(existingTag.id);
        } else {
          // Create new tag
          const newTag = await createTag(ownerUserId, { name: normalizedName });
          tagIds.push(newTag.id);
        }
      }

      // Link all tags to the task
      if (tagIds.length > 0) {
        await addTagsToEntity(ownerUserId, tagIds, 'task', taskId);
      }
    } catch (err) {
      console.error('[TaskCreationModal] Error linking tags:', err);
      // Don't throw - tag linking failure shouldn't prevent task save
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

    if (!date) {
      setError('Date is required');
      return;
    }

    setSaving(true);

    try {
      const input: CreateStandaloneTaskInput = {
        user_id: userId,
        title: title.trim(),
        date: date,
        start_time: startTime || undefined,
        duration_minutes: durationMinutes || undefined,
        completed: false,
      };

      const createdTask = await createStandaloneTask(input);
      
      // Link tags to task after creation
      await linkTagsToTask(userId, createdTask.id, tagNames);
      
      // Create reminders after task creation
      if (pendingReminders.length > 0 && user) {
        for (const reminder of pendingReminders) {
          try {
            await createReminder(user.id, {
              entity_type: 'task',
              entity_id: createdTask.id,
              offset_minutes: reminder.offset_minutes,
              notify_owner: reminder.notify_owner,
              notify_attendees: reminder.notify_attendees,
            });
          } catch (err) {
            console.error('[TaskCreationModal] Error creating reminder:', err);
            // Don't fail task creation if reminder creation fails
          }
        }
        setPendingReminders([]); // Clear pending reminders
      }
      
      onSaved();
      onClose();
    } catch (err) {
      console.error('[TaskCreationModal] Error creating task:', err);
      setError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setSaving(false);
    }
  };

  // Render form content (scrollable fields only - buttons moved to footer)
  const renderFormContent = () => (
    <form id="task-form" onSubmit={handleSubmit} className="flex flex-col gap-4 pb-4">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Error</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Task Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="What do you need to do?"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          autoFocus
          id="task-title-input"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Date <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Start Time (optional)
          </label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Duration (optional)
          </label>
          <select
            value={durationMinutes || ''}
            onChange={(e) =>
              setDurationMinutes(
                e.target.value ? parseInt(e.target.value, 10) : null
              )
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">No duration</option>
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="60">1 hour</option>
            <option value="90">1.5 hours</option>
            <option value="120">2 hours</option>
            <option value="180">3 hours</option>
          </select>
        </div>
      </div>

      {/* Tags Section */}
      {user && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags
          </label>
          <TagInput
            userId={userId}
            entityType="task"
            entityId={null}
            onTagsChange={setTagNames}
            placeholder="Add tags with @ (e.g., @work @urgent)"
            disabled={saving}
          />
        </div>
      )}

      {/* Reminders Section */}
      {user && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Reminders
            </label>
            {!remindersExpanded && pendingReminders.length > 0 && (
              <button
                type="button"
                onClick={() => setRemindersExpanded(true)}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <ChevronDown className="w-3.5 h-3.5" />
                Expand
              </button>
            )}
            {remindersExpanded && (
              <button
                type="button"
                onClick={() => setRemindersExpanded(false)}
                className="text-xs text-gray-600 hover:text-gray-700 flex items-center gap-1"
              >
                <ChevronUp className="w-3.5 h-3.5" />
                Collapse
              </button>
            )}
          </div>

          {/* Show existing reminders even when collapsed */}
          {!remindersExpanded && pendingReminders.length > 0 && (
            <div className="space-y-1.5">
              {pendingReminders.map((reminder, idx) => (
                <div
                  key={`pending-${idx}`}
                  className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm"
                >
                  <Bell className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                  <span className="flex-1 text-gray-900 font-medium">
                    {formatReminderOffset(reminder.offset_minutes)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Collapsed: Show "Add Reminder" button */}
          {!remindersExpanded && pendingReminders.length === 0 && (
            <button
              type="button"
              onClick={() => setRemindersExpanded(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Reminder
            </button>
          )}

          {/* Expanded: Show full ReminderSelector */}
          {remindersExpanded && (
            <div className="space-y-3">
              <ReminderSelector
                entityType="task"
                entityId={null}
                disabled={saving}
                pendingReminders={pendingReminders}
                onPendingRemindersChange={setPendingReminders}
              />

              {/* Custom Reminder Input */}
              {!showCustomReminderInput ? (
                <button
                  type="button"
                  onClick={() => setShowCustomReminderInput(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Custom Reminder
                </button>
              ) : (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Custom Reminder</label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomReminderInput(false);
                        setCustomReminderValue('');
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={customReminderValue}
                      onChange={(e) => setCustomReminderValue(e.target.value)}
                      placeholder="0"
                      min="0"
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <select
                      value={customReminderUnit}
                      onChange={(e) => setCustomReminderUnit(e.target.value as 'minutes' | 'hours' | 'days')}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const value = parseInt(customReminderValue, 10);
                      if (isNaN(value) || value < 0) {
                        return;
                      }
                      let offsetMinutes = value;
                      if (customReminderUnit === 'hours') {
                        offsetMinutes = value * 60;
                      } else if (customReminderUnit === 'days') {
                        offsetMinutes = value * 1440;
                      }

                      // Check if reminder already exists (prevent duplicates)
                      if (pendingReminders.some(r => r.offset_minutes === offsetMinutes)) {
                        setCustomReminderValue('');
                        setShowCustomReminderInput(false);
                        return;
                      }
                      
                      // Note: For new tasks, we only check pendingReminders since entityId is null

                      setPendingReminders([
                        ...pendingReminders,
                        { offset_minutes: offsetMinutes, notify_owner: true, notify_attendees: false },
                      ].sort((a, b) => a.offset_minutes - b.offset_minutes));
                      setCustomReminderValue('');
                      setShowCustomReminderInput(false);
                    }}
                    disabled={!customReminderValue || isNaN(parseInt(customReminderValue, 10)) || parseInt(customReminderValue, 10) < 0}
                    className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Add Reminder
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Delegate Section - inside scrollable content */}
      {showDelegate && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              Delegate To (Optional)
            </label>
            <button
              type="button"
              onClick={() => {
                setShowDelegate(false);
                setDelegatedTo(null);
              }}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              aria-label="Close delegate section"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <select
            value={delegatedTo || ''}
            onChange={(e) => setDelegatedTo(e.target.value || null)}
            className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="">No delegation</option>
            {/* TODO: Load household members or team members for delegation */}
            <option value="placeholder">Household Member 1</option>
            <option value="placeholder2">Household Member 2</option>
          </select>
          <p className="text-xs text-gray-500 mt-2">
            Assign this task to someone else to complete
          </p>
        </div>
      )}
    </form>
  );

  // Render footer with action buttons (sticky at bottom, always visible)
  // Note: Added pb-20 on mobile to account for fixed bottom navigation bar (CALENDAR/AREAS)
  const renderFooter = () => (
    <div className={`flex flex-col gap-3 ${isMobile ? 'pb-20' : ''}`}>
      <button
        type="button"
        onClick={() => setShowDelegate(!showDelegate)}
        disabled={saving}
        className="w-full px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 min-h-[44px]"
      >
        <UserPlus className="w-4 h-4" />
        {showDelegate ? 'Cancel Delegate' : 'Delegate Task'}
      </button>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] flex items-center justify-center"
        >
          Cancel
        </button>
        <button
          type="submit"
          form="task-form"
          disabled={saving || !title.trim() || !date}
          className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 min-h-[44px]"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Task'
          )}
        </button>
      </div>
    </div>
  );

  // Mobile: Bottom Sheet
  if (isMobile) {
    return (
      <BottomSheet 
        isOpen={isOpen} 
        onClose={onClose} 
        title="Add Task"
        maxHeight="85vh"
        footer={renderFooter()}
      >
        <div className="px-4 py-3">{renderFormContent()}</div>
      </BottomSheet>
    );
  }

  // Desktop: Centered Modal
  return (
    <div
      className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 transition-opacity duration-200 ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-xl shadow-2xl w-full max-w-md transition-transform duration-200 flex flex-col max-h-[85vh] ${
          isOpen ? 'translate-y-0' : '-translate-y-4'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Add Task</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          {renderFormContent()}
        </div>

        {/* Footer - Sticky at bottom for desktop */}
        <div className="border-t border-gray-200 px-6 py-4 flex-shrink-0">
          {renderFooter()}
        </div>
      </div>
    </div>
  );
}
