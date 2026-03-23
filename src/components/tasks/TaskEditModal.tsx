/**
 * TaskEditModal - Modal for editing existing tasks (both event-linked and standalone)
 * 
 * Based on TaskCreationModal but supports editing existing tasks.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Calendar, Loader2, AlertCircle, Trash2, Bell, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { BottomSheet } from '../shared/BottomSheet';
import {
  updateEventTask,
  deleteEventTask,
  type EventTask,
  type UpdateEventTaskInput,
} from '../../lib/personalSpaces/eventTasksService';
import { TagInput } from '../tags/TagInput';
import { getUserTags, createTag, addTagsToEntity, removeTagsFromEntity, getTagsForEntity } from '../../lib/tags/tagService';
import { useAuth } from '../../contexts/AuthContext';
import { ReminderSelector } from '../reminders/ReminderSelector';
import { getRemindersForEntity, formatReminderOffset } from '../../lib/reminders/reminderService';
import { ConfirmDialogInline } from '../ConfirmDialogInline';

interface TaskEditModalProps {
  userId: string;
  task: EventTask;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
  readOnly?: boolean;
}

export function TaskEditModal({
  userId,
  task,
  isOpen,
  onClose,
  onSaved,
  onDeleted,
  readOnly = false,
}: TaskEditModalProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Tags state
  const [tagNames, setTagNames] = useState<string[]>([]);
  const { user } = useAuth();

  // Reminders state
  const [existingReminders, setExistingReminders] = useState<Array<{
    id: string;
    offset_minutes: number;
    notify_owner: boolean;
    notify_attendees: boolean;
  }>>([]);
  const [remindersExpanded, setRemindersExpanded] = useState(false);
  const previousRemindersRef = useRef<string>(''); // Track previous reminders to prevent loops

  // Memoized callback for ReminderSelector to prevent infinite loops
  const handleRemindersChange = useCallback((reminders: Array<{
    id: string;
    offset_minutes: number;
    notify_owner: boolean;
    notify_attendees: boolean;
  }>) => {
    // Create a stable string representation of reminders to compare
    const remindersKey = JSON.stringify(reminders.map(r => ({
      id: r.id,
      offset_minutes: r.offset_minutes,
      notify_owner: r.notify_owner,
      notify_attendees: r.notify_attendees,
    })));
    
    // Only update if reminders actually changed (prevent infinite loops)
    if (previousRemindersRef.current !== remindersKey) {
      previousRemindersRef.current = remindersKey;
      setExistingReminders(reminders);
    }
  }, []);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load task data when modal opens or task changes
  useEffect(() => {
    if (isOpen && task) {
      setTitle(task.title);
      setProgress(task.progress ?? 0);
      
      // Only set date/time for standalone tasks (event_id is null)
      if (task.event_id === null) {
        setDate(task.date || '');
        setStartTime(task.start_time || '');
        setDurationMinutes(task.duration_minutes || null);
      } else {
        // Event-linked task - date/time is derived from event, don't allow editing
        setDate('');
        setStartTime('');
        setDurationMinutes(null);
      }

      // Load tags for this task
      if (user) {
        loadTags(task.id);
      }

      // Load reminders for this task
      if (user) {
        loadReminders(task.id);
      }
    }
  }, [isOpen, task, user]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setRemindersExpanded(false);
      setShowDeleteConfirm(false);
    }
  }, [isOpen]);

  // Load tags for the task
  const loadTags = async (taskId: string) => {
    if (!user) return;

    try {
      const tags = await getTagsForEntity(userId, 'task', taskId);
      setTagNames(tags.map(t => t.name));
    } catch (err) {
      console.error('[TaskEditModal] Error loading tags:', err);
      // Don't throw - tag loading failure shouldn't prevent editing
    }
  };

  // Load reminders for the task
  const loadReminders = async (taskId: string) => {
    if (!user) return;

    try {
      const reminders = await getRemindersForEntity('task', taskId);
      setExistingReminders(reminders.map(r => ({
        id: r.id,
        offset_minutes: r.offset_minutes,
        notify_owner: r.notify_owner,
        notify_attendees: r.notify_attendees,
      })));
      // Auto-expand if there are existing reminders
      if (reminders.length > 0) {
        setRemindersExpanded(true);
      }
    } catch (err) {
      console.error('[TaskEditModal] Error loading reminders:', err);
    }
  };

  // Helper function to link tags to task
  const linkTagsToTask = async (ownerUserId: string, taskId: string, newTagNames: string[], oldTagNames: string[]) => {
    if (!user) return;

    try {
      // Get current tags for the task
      const currentTags = await getTagsForEntity(ownerUserId, 'task', taskId);
      const currentTagNames = currentTags.map(t => t.name.toLowerCase());

      // Get all user tags
      const userTagsList = await getUserTags(ownerUserId);
      
      // Determine which tags to add and which to remove
      const tagsToAdd = newTagNames.filter(name => {
        const normalizedName = name.trim().toLowerCase();
        return !currentTagNames.includes(normalizedName);
      });

      const tagsToRemove = currentTags.filter(tag => {
        const normalizedName = tag.name.toLowerCase();
        return !newTagNames.some(name => name.trim().toLowerCase() === normalizedName);
      });

      // Add new tags
      const tagIds: string[] = [];
      for (const tagName of tagsToAdd) {
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

      if (tagIds.length > 0) {
        await addTagsToEntity(ownerUserId, tagIds, 'task', taskId);
      }

      // Remove tags that are no longer in the list
      if (tagsToRemove.length > 0) {
        const tagIdsToRemove = tagsToRemove.map(t => t.id);
        await removeTagsFromEntity(ownerUserId, tagIdsToRemove, 'task', taskId);
      }
    } catch (err) {
      console.error('[TaskEditModal] Error linking tags:', err);
      // Don't throw - tag linking failure shouldn't prevent task save
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (readOnly) {
      return;
    }

    setError(null);

    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

    if (task.event_id === null && !date) {
      setError('Date is required for standalone tasks');
      return;
    }

    setSaving(true);

    try {
      const updates: UpdateEventTaskInput = {
        title: title.trim(),
        progress: progress,
      };

      // Only update date/time for standalone tasks
      if (task.event_id === null) {
        updates.date = date;
        updates.start_time = startTime || undefined;
        updates.duration_minutes = durationMinutes || undefined;
      }

      await updateEventTask(task.id, updates);
      
      // Update tags after task update
      await linkTagsToTask(userId, task.id, tagNames, []);
      
      onSaved();
      onClose();
    } catch (err) {
      console.error('[TaskEditModal] Error updating task:', err);
      setError(err instanceof Error ? err.message : 'Failed to update task');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (readOnly || !task) {
      return;
    }
    
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!task) return;
    
    setShowDeleteConfirm(false);
    setDeleting(true);
    setError(null);

    try {
      await deleteEventTask(task.id);
      if (onDeleted) {
        onDeleted();
      }
      onSaved(); // Refresh the task list
      onClose();
    } catch (err) {
      console.error('[TaskEditModal] Error deleting task:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete task');
    } finally {
      setDeleting(false);
    }
  };

  // Render form content (scrollable fields only - buttons moved to footer)
  const renderFormContent = () => (
    <form id="task-edit-form" onSubmit={handleSubmit} className="flex flex-col gap-4 pb-4">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Error</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {task.event_id && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            This task is linked to an event. Date and time are managed by the event.
          </p>
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
          disabled={readOnly}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          autoFocus
          id="task-title-input"
        />
      </div>

      {/* Date - Only for standalone tasks */}
      {task.event_id === null && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            disabled={readOnly}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>
      )}

      {/* Time and Duration - Only for standalone tasks */}
      {task.event_id === null && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Time (optional)
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              disabled={readOnly}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
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
              disabled={readOnly}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
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
      )}

      {/* Progress Slider */}
      {!readOnly && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Progress: {progress}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={progress}
            onChange={(e) => setProgress(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      )}

      {/* Tags Section */}
      {user && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags
          </label>
          <TagInput
            userId={userId}
            entityType="task"
            entityId={task.id}
            onTagsChange={setTagNames}
            placeholder="Add tags with @ (e.g., @work @urgent)"
            disabled={readOnly || saving}
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
            {!remindersExpanded && existingReminders.length > 0 && (
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
          {!remindersExpanded && existingReminders.length > 0 && (
            <div className="space-y-1.5">
              {existingReminders.map((reminder) => (
                <div
                  key={reminder.id}
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
          {!remindersExpanded && existingReminders.length === 0 && (
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
            <ReminderSelector
              entityType="task"
              entityId={task.id}
              disabled={readOnly || saving}
              onRemindersChange={handleRemindersChange}
            />
          )}
        </div>
      )}
    </form>
  );

  // Render footer with action buttons (sticky at bottom, always visible)
  // Note: Added pb-20 on mobile to account for fixed bottom navigation bar (CALENDAR/AREAS)
  const renderFooter = () => (
    <div className={`flex flex-col gap-3 ${isMobile ? 'pb-20' : ''}`}>
      {!readOnly && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={saving || deleting}
          className="w-full px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 min-h-[44px]"
        >
          {deleting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Deleting...
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4" />
              Delete Task
            </>
          )}
        </button>
      )}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={saving || deleting}
          className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] flex items-center justify-center"
        >
          {readOnly ? 'Close' : 'Cancel'}
        </button>
        {!readOnly && (
          <button
            type="submit"
            form="task-edit-form"
            disabled={saving || deleting || !title.trim() || (task.event_id === null && !date)}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 min-h-[44px]"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        )}
      </div>
    </div>
  );

  // Mobile: Bottom Sheet
  if (isMobile) {
    return (
      <>
        <BottomSheet 
          isOpen={isOpen} 
          onClose={onClose} 
          title="Edit Task"
          maxHeight="85vh"
          footer={renderFooter()}
        >
          <div className="px-4 py-3">{renderFormContent()}</div>
        </BottomSheet>

        <ConfirmDialogInline
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={confirmDelete}
          title="Delete Task"
          message="Are you sure you want to delete this task? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          confirmVariant="danger"
          loading={deleting}
        />
      </>
    );
  }

  // Desktop: Centered Modal
  return (
    <>
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
              <h2 className="text-lg font-semibold text-gray-900">Edit Task</h2>
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

      <ConfirmDialogInline
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
        loading={deleting}
      />
    </>
  );
}
