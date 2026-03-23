import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { X, Calendar, Loader2, AlertCircle, Link as LinkIcon, Share2, Trash2, Plus, CheckSquare, Square, Users, Mail, User, Search, Bell, ChevronDown, ChevronUp } from 'lucide-react';
import { useCalendarSyncSettings } from '../../hooks/useCalendarSyncSettings';
import { useAuth } from '../../contexts/AuthContext';
import {
  createPersonalCalendarEvent,
  updatePersonalCalendarEvent,
  deletePersonalCalendarEvent,
  getPersonalCalendarEvent,
  type PersonalCalendarEvent,
  type CreatePersonalEventInput,
  type UpdatePersonalEventInput,
  type CalendarEventType,
} from '../../lib/personalSpaces/calendarService';
import {
  getEventTasks,
  createEventTask,
  updateEventTask,
  deleteEventTask,
  type EventTask,
} from '../../lib/personalSpaces/eventTasksService';
import { TaskProgressSlider } from '../tasks/TaskProgressSlider';
import { TaskEditModal } from '../tasks/TaskEditModal';
import { EventTypeSelector } from '../calendar/EventTypeSelector';
import { useSharingDrawer } from '../../hooks/useSharingDrawer';
import { SharingDrawer } from '../sharing/SharingDrawer';
import { PermissionIndicator } from '../sharing/PermissionIndicator';
import { BottomSheet } from '../shared/BottomSheet';
import { ConfirmDialogInline } from '../ConfirmDialogInline';
import { searchContacts, type Contact } from '../../lib/contacts/contactsService';
import { findUserByEmail } from '../../lib/personalSpaces/calendarSharingService';
import { supabase } from '../../lib/supabase';
import { TagInput } from '../tags/TagInput';
import { getUserTags, createTag, addTagsToEntity } from '../../lib/tags/tagService';
import { ReminderSelector } from '../reminders/ReminderSelector';
import { createReminder, getRemindersForEntity, type CreateReminderInput, formatReminderOffset } from '../../lib/reminders/reminderService';

interface PersonalEventModalProps {
  userId: string;
  event?: PersonalCalendarEvent | null;
  initialDate?: string;
  onClose: () => void;
  onSaved: () => void;
  readOnly?: boolean; // When true, disables editing (for shared calendar viewing)
  viewerUserId?: string; // Current user viewing the calendar (for shared calendars)
}

type IntegrationType = 'personal' | 'roadmap_event' | 'task';

export function PersonalEventModal({
  userId,
  event,
  initialDate,
  onClose,
  onSaved,
  readOnly = false,
  viewerUserId,
}: PersonalEventModalProps) {
  const { settings: syncSettings } = useCalendarSyncSettings();

  // Helper: Get default start time (next hour on the hour)
  const getDefaultStartTime = (): string => {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0);
    return nextHour.toTimeString().slice(0, 5); // HH:mm format
  };

  // Helper: Calculate end date/time from start date/time (+1 hour, special handling for 11pm+)
  const calculateEndDateTime = (
    startDateStr: string,
    startTimeStr: string
  ): { endDate: string; endTime: string } => {
    if (!startDateStr) {
      return { endDate: '', endTime: '' };
    }

    const [startHour, startMinute] = startTimeStr
      ? startTimeStr.split(':').map(Number)
      : [0, 0];

    // If start time is after 11pm (23:00), end time is 12am (00:00) next day
    if (startHour >= 23) {
      const endDate = new Date(startDateStr);
      endDate.setDate(endDate.getDate() + 1);
      return {
        endDate: endDate.toISOString().split('T')[0],
        endTime: '00:00',
      };
    }

    // Otherwise, end time is 1 hour after start time
    const endHour = startHour + 1;
    const endTime = `${endHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
    return {
      endDate: startDateStr,
      endTime,
    };
  };
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [eventType, setEventType] = useState<CalendarEventType>('event');
  const [integrationType, setIntegrationType] = useState<IntegrationType>('personal');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Tasks state
  const [tasks, setTasks] = useState<EventTask[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState('');
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [selectedTask, setSelectedTask] = useState<EventTask | null>(null);
  const [isTaskEditModalOpen, setIsTaskEditModalOpen] = useState(false);

  // Members/Invitations state
  const { user } = useAuth();
  const [members, setMembers] = useState<Array<{ id: string; name: string; email: string | null; isUser: boolean }>>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState<Array<{ id: string; name: string; email: string | null; isUser: boolean; isContact: boolean }>>([]);
  const [searchingMembers, setSearchingMembers] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [showInviteEmailInput, setShowInviteEmailInput] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Tags state
  const [tagNames, setTagNames] = useState<string[]>([]);

  // Reminders state (for new events)
  const [pendingReminders, setPendingReminders] = useState<Array<{
    offset_minutes: number;
    notify_owner: boolean;
    notify_attendees: boolean;
  }>>([]);
  const [remindersExpanded, setRemindersExpanded] = useState(false);
  const [existingReminders, setExistingReminders] = useState<Array<{
    id: string;
    offset_minutes: number;
    notify_owner: boolean;
    notify_attendees: boolean;
  }>>([]);
  const previousRemindersRef = useRef<string>(''); // Track previous reminders to prevent loops
  const [customReminderValue, setCustomReminderValue] = useState('');
  const [customReminderUnit, setCustomReminderUnit] = useState<'minutes' | 'hours' | 'days'>('minutes');
  const [showCustomReminderInput, setShowCustomReminderInput] = useState(false);

  // Memoize the onRemindersChange callback to prevent infinite loops
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

  const isEditing = !!event;
  const isIntegrated = event?.sourceType === 'guardrails';
  const isContextEvent = event?.sourceType === 'context';
  const canIntegrateWithGuardrails =
    syncSettings?.syncPersonalToGuardrails && !isEditing && !isIntegrated;
  
  // Sharing state (only for context events)
  const { isOpen: isSharingOpen, adapter: sharingAdapter, openDrawer: openSharing, closeDrawer: closeSharing } = useSharingDrawer(
    'calendar_event',
    isContextEvent && event ? event.id : null
  );
  const canManageEvent = isContextEvent && event ? (event.userId === userId) : false;

  // Defensive: Close modal if read-only state changes while editing (permission drift)
  useEffect(() => {
    // If we were editing and suddenly became read-only, close the modal
    // This handles cases where permission is revoked while the modal is open
    if (readOnly && !isEditing) {
      // For new events, just close silently
      onClose();
    } else if (readOnly && isEditing) {
      // For existing events, close and notify (permission was revoked)
      onClose();
    }
  }, [readOnly, isEditing, onClose]);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || '');
      setEventType(event.event_type || 'event');

      const startDt = new Date(event.startAt);
      setStartDate(startDt.toISOString().split('T')[0]);
      setStartTime(startDt.toTimeString().slice(0, 5));
      setAllDay(event.allDay);

      if (event.endAt) {
        const endDt = new Date(event.endAt);
        setEndDate(endDt.toISOString().split('T')[0]);
        setEndTime(endDt.toTimeString().slice(0, 5));
      }

      // Load tasks for this event
      loadTasks(event.id);

      // Load members for this event
      loadMembers(event.id);
      
      // Load existing reminders for this event
      loadReminders(event.id);
      // Reset custom reminder input state when editing existing event
      setShowCustomReminderInput(false);
      setCustomReminderValue('');
      setRemindersExpanded(false); // Auto-expand if reminders exist is handled in loadReminders
    } else if (initialDate) {
      // New event: set default start time to next hour on the hour
      const defaultStartTime = getDefaultStartTime();
      setStartDate(initialDate);
      setStartTime(defaultStartTime);
      setEventType('event');
      setTasks([]); // Clear tasks for new events
      setPendingReminders([]); // Clear pending reminders for new events
      setRemindersExpanded(false); // Collapse reminders for new events
      setShowCustomReminderInput(false);
      setCustomReminderValue('');

      // Calculate initial end date/time
      const { endDate, endTime } = calculateEndDateTime(initialDate, defaultStartTime);
      setEndDate(endDate);
      setEndTime(endTime);
    }
  }, [event, initialDate]);

  // Auto-update end date/time when start date/time changes (only for new events, not editing)
  // Note: This acts as a safety net, but onChange handlers also update end date/time for immediate feedback
  useEffect(() => {
    // Skip auto-update if:
    // - Editing an existing event (preserve user's end time)
    // - All-day event (end date/time handled separately)
    // - No start date or start time set
    if (event || allDay || !startDate || !startTime) {
      return;
    }

    const { endDate, endTime } = calculateEndDateTime(startDate, startTime);
    setEndDate(endDate);
    setEndTime(endTime);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // calculateEndDateTime is a pure function with no dependencies, safe to omit
  }, [startDate, startTime, allDay, event]);

  // Load tasks for an event
  const loadTasks = async (eventId: string) => {
    setLoadingTasks(true);
    try {
      const eventTasks = await getEventTasks(eventId);
      setTasks(eventTasks);
    } catch (err) {
      console.error('[PersonalEventModal] Error loading tasks:', err);
    } finally {
      setLoadingTasks(false);
    }
  };

  // Add a new task
  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !event || readOnly) return;

    try {
      const newTask = await createEventTask({
        event_id: event.id,
        title: newTaskTitle.trim(),
        completed: false,
      });
      setTasks([...tasks, newTask]);
      setNewTaskTitle('');
    } catch (err) {
      console.error('[PersonalEventModal] Error adding task:', err);
      setError(err instanceof Error ? err.message : 'Failed to add task');
    }
  };

  // Toggle task completion (Phase 6: Sets progress to 100% or previous value)
  const handleToggleTask = async (task: EventTask) => {
    if (readOnly) return; // Don't allow toggling tasks in read-only mode
    try {
      // If currently completed (progress = 100), uncomplete (restore previous or set to 0)
      // If not completed, mark as complete (progress = 100)
      const updatedTask = await updateEventTask(task.id, {
        completed: !task.completed,
        // Progress will be synced automatically by trigger: completed=true → progress=100, completed=false → preserve or 0
      });
      setTasks(tasks.map(t => t.id === task.id ? updatedTask : t));
    } catch (err) {
      console.error('[PersonalEventModal] Error updating task:', err);
      setError(err instanceof Error ? err.message : 'Failed to update task');
    }
  };

  // Handle progress change (Phase 6: Progress slider)
  const handleProgressChange = async (taskId: string, progress: number) => {
    if (readOnly) return; // Don't allow changing progress in read-only mode
    try {
      const updatedTask = await updateEventTask(taskId, {
        progress: progress,
        // Status and completed will be synced automatically: progress=100 → completed=true, progress<100 → completed=false
      });
      setTasks(tasks.map(t => t.id === taskId ? updatedTask : t));
    } catch (err) {
      console.error('[PersonalEventModal] Error updating task progress:', err);
      setError(err instanceof Error ? err.message : 'Failed to update task progress');
    }
  };

  // Start editing a task
  const handleStartEditTask = (task: EventTask) => {
    if (readOnly) return; // Don't allow editing tasks in read-only mode
    setEditingTaskId(task.id);
    setEditingTaskTitle(task.title);
  };

  // Save edited task
  const handleSaveEditTask = async (taskId: string) => {
    if (!editingTaskTitle.trim()) {
      setEditingTaskId(null);
      return;
    }

    try {
      const updatedTask = await updateEventTask(taskId, {
        title: editingTaskTitle.trim(),
      });
      setTasks(tasks.map(t => t.id === taskId ? updatedTask : t));
      setEditingTaskId(null);
      setEditingTaskTitle('');
    } catch (err) {
      console.error('[PersonalEventModal] Error updating task:', err);
      setError(err instanceof Error ? err.message : 'Failed to update task');
    }
  };

  // Cancel editing
  const handleCancelEditTask = () => {
    setEditingTaskId(null);
    setEditingTaskTitle('');
  };

  // Delete a task
  const handleDeleteTask = async (taskId: string) => {
    if (readOnly) return; // Don't allow deleting tasks in read-only mode
    try {
      await deleteEventTask(taskId);
      setTasks(tasks.filter(t => t.id !== taskId));
    } catch (err) {
      console.error('[PersonalEventModal] Error deleting task:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete task');
    }
  };

  // Load reminders for an event
  const loadReminders = async (eventId: string) => {
    if (!user) return;
    try {
      const reminders = await getRemindersForEntity('event', eventId);
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
      console.error('[PersonalEventModal] Error loading reminders:', err);
    }
  };

  // Load members for an event
  const loadMembers = async (eventId: string) => {
    if (!user) return;
    
    setLoadingMembers(true);
    try {
      const event = await getPersonalCalendarEvent(userId, eventId);
      if (event && (event as any).member_profiles) {
        const memberProfiles = (event as any).member_profiles.map((mp: any) => ({
          id: mp.id, // Profile ID
          name: mp.full_name || mp.email || 'Unknown',
          email: mp.email,
          isUser: true, // These are profiles, so they're users
        }));
        setMembers(memberProfiles);
      } else {
        setMembers([]);
      }
    } catch (err) {
      console.error('[PersonalEventModal] Error loading members:', err);
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  // Search for contacts/users to add as members
  const handleMemberSearch = async (query: string) => {
    if (!user || !query.trim()) {
      setMemberSearchResults([]);
      return;
    }

    setSearchingMembers(true);
    try {
      // Search contacts
      const contacts = await searchContacts(user.id, query);
      
      // Convert contacts to search results
      const contactResults: Array<{ id: string; name: string; email: string | null; isUser: boolean; isContact: boolean }> = [];
      
      for (const contact of contacts) {
        if (contact.linked_user_id) {
          // Contact is linked to a user - get profile ID
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', contact.linked_user_id)
            .maybeSingle();
          
          if (profile) {
            contactResults.push({
              id: profile.id, // Profile ID for member_ids
              name: contact.display_name,
              email: contact.email,
              isUser: true,
              isContact: true,
            });
          }
        } else {
          // Contact without linked user - still add but will need email invitation
          contactResults.push({
            id: contact.id, // Contact ID (will need special handling)
            name: contact.display_name,
            email: contact.email,
            isUser: false,
            isContact: true,
          });
        }
      }

      // Also search for users by email
      const emailMatch = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(query.trim());
      if (emailMatch) {
        const userMatch = await findUserByEmail(query.trim());
        if (userMatch) {
          // Check if not already in results
          const alreadyAdded = contactResults.some(r => r.email === userMatch.email);
          if (!alreadyAdded) {
            // Need to get profile ID from user_id
            const { data: profile } = await supabase
              .from('profiles')
              .select('id')
              .eq('user_id', userMatch.id)
              .maybeSingle();
            
            if (profile) {
              contactResults.push({
                id: profile.id, // Profile ID for member_ids
                name: userMatch.full_name || userMatch.email,
                email: userMatch.email,
                isUser: true,
                isContact: false,
              });
            }
          }
        }
      }

      setMemberSearchResults(contactResults);
    } catch (err) {
      console.error('[PersonalEventModal] Error searching members:', err);
      setMemberSearchResults([]);
    } finally {
      setSearchingMembers(false);
    }
  };

  // Debounce search
  useEffect(() => {
    if (!memberSearchQuery.trim() || !user) {
      setMemberSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      handleMemberSearch(memberSearchQuery);
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // handleMemberSearch is stable and uses user from closure
  }, [memberSearchQuery]);

  // Add member from search results
  const handleAddMember = (result: { id: string; name: string; email: string | null; isUser: boolean }) => {
    // Only add if it's a user (has profile ID), not a contact-only
    if (!result.isUser) {
      setError('Please invite users who have accounts. Email invitations for non-users will be implemented soon.');
      return;
    }

    // Check if already added
    if (members.some(m => m.id === result.id)) {
      return;
    }

    setMembers([...members, result]);
    setMemberSearchQuery('');
    setMemberSearchResults([]);
  };

  // Remove member
  const handleRemoveMember = (memberId: string) => {
    setMembers(members.filter(m => m.id !== memberId));
  };

  // Add invite by email (for non-users)
  const handleInviteByEmail = async () => {
    if (!inviteEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim())) {
      return;
    }

    // Check if email belongs to an existing user
    const existingUser = await findUserByEmail(inviteEmail.trim());
    if (existingUser) {
      // Get profile ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', existingUser.id)
        .maybeSingle();

      if (profile) {
        handleAddMember({
          id: profile.id,
          name: existingUser.full_name || existingUser.email,
          email: existingUser.email,
          isUser: true,
        });
        setInviteEmail('');
        setShowInviteEmailInput(false);
        return;
      }
    }

    // For non-users, we'll need an invitation system (to be implemented)
    setError('Email invitations for non-users will be implemented in the next phase. Please invite users who already have accounts.');
    setInviteEmail('');
    setShowInviteEmailInput(false);
  };

  // Helper function to link tags to event
  const linkTagsToEvent = async (ownerUserId: string, eventId: string, tagNames: string[]) => {
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

      // Link all tags to the event
      if (tagIds.length > 0) {
        await addTagsToEntity(ownerUserId, tagIds, 'meeting', eventId);
      }
    } catch (err) {
      console.error('[PersonalEventModal] Error linking tags:', err);
      // Don't throw - tag linking failure shouldn't prevent event save
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Defensive check: Prevent mutations in read-only mode
    // This is a critical guard - even if UI allows it, backend will reject
    if (readOnly) {
      console.warn('[PersonalEventModal] Attempted to save in read-only mode');
      return;
    }
    
    setError(null);
    setSaving(true);

    try {
      let startAt: string;
      let endAt: string | undefined;

      if (allDay) {
        startAt = `${startDate}T00:00:00Z`;
        if (endDate) {
          endAt = `${endDate}T23:59:59Z`;
        }
      } else {
        startAt = `${startDate}T${startTime}:00Z`;
        if (endDate && endTime) {
          endAt = `${endDate}T${endTime}:00Z`;
        }
      }

      // Convert members to profile IDs for member_ids (they're already profile IDs)
      const memberProfileIds = members.map(m => m.id);

      if (isEditing && event) {
        const updateInput: UpdatePersonalEventInput = {
          title,
          description,
          startAt,
          endAt,
          allDay,
          event_type: eventType,
          member_ids: memberProfileIds,
        };

        // Use event.userId as the owner (authoritative source), or fall back to userId prop
        const eventOwnerId = event.userId || userId;
        // For shared calendars, pass viewerUserId as actorUserId for permission checks
        await updatePersonalCalendarEvent(eventOwnerId, event.id, updateInput, viewerUserId);
        
        // Link tags to event after update
        await linkTagsToEvent(eventOwnerId, event.id, tagNames);
        
        onSaved();
      } else {
        const createInput: CreatePersonalEventInput = {
          title,
          description,
          startAt,
          endAt,
          allDay,
          event_type: eventType,
          member_ids: memberProfileIds,
        };

        // For shared calendars with write access, pass viewerUserId as actorUserId
        // This allows creating events on someone else's calendar if write permission is granted
        const createdEvent = await createPersonalCalendarEvent(userId, createInput, viewerUserId);

        // Link tags to event after creation
        await linkTagsToEvent(userId, createdEvent.id, tagNames);

        // Create reminders after event creation
        if (pendingReminders.length > 0 && user) {
          for (const reminder of pendingReminders) {
            try {
              await createReminder(user.id, {
                entity_type: 'event',
                entity_id: createdEvent.id,
                offset_minutes: reminder.offset_minutes,
                notify_owner: reminder.notify_owner,
                notify_attendees: reminder.notify_attendees,
              });
            } catch (err) {
              console.error('[PersonalEventModal] Error creating reminder:', err);
              // Don't fail event creation if reminder creation fails
            }
          }
          setPendingReminders([]); // Clear pending reminders
        }

        if (integrationType !== 'personal') {
          console.log(
            `[PersonalEventModal] Guardrails integration selected: ${integrationType}`
          );
          console.log('[PersonalEventModal] Integration via MindMesh V2 not yet implemented');
        }

        onSaved();
      }
    } catch (err) {
      console.error('[PersonalEventModal] Error saving event:', err);
      setError(err instanceof Error ? err.message : 'Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    // Defensive check: Prevent deletion in read-only mode
    if (!event || readOnly) {
      console.warn('[PersonalEventModal] Attempted to delete in read-only mode');
      return;
    }
    
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!event) return;
    
    setShowDeleteConfirm(false);
    setDeleting(true);
    setError(null);

    try {
      // Use event.userId as the owner (authoritative source), or fall back to userId prop
      const eventOwnerId = event.userId || userId;
      // For shared calendars with write access, pass viewerUserId as actorUserId for permission checks
      await deletePersonalCalendarEvent(eventOwnerId, event.id, viewerUserId);
      onSaved(); // This will close the modal and refresh the calendar
      onClose();
    } catch (err) {
      console.error('[PersonalEventModal] Error deleting event:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete event');
    } finally {
      setDeleting(false);
    }
  };

  // Render form content (shared between mobile and desktop)
  const renderFormContent = () => (
    <>
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Error</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {isIntegrated && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            This event is part of a Guardrails project. Changes here will update your work
            calendar.
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          placeholder="Optional details"
        />
      </div>

      {/* Tags Section */}
      {!readOnly && user && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags
          </label>
          <TagInput
            userId={userId}
            entityType="meeting"
            entityId={event?.id || null}
            onTagsChange={setTagNames}
            placeholder="Add tags with @ (e.g., @work @urgent)"
            disabled={readOnly || saving}
          />
        </div>
      )}

      {/* Reminders Section */}
      {!readOnly && user && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Reminders
            </label>
            {!remindersExpanded && (existingReminders.length > 0 || pendingReminders.length > 0) && (
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
          {!remindersExpanded && (existingReminders.length > 0 || pendingReminders.length > 0) && (
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
          {!remindersExpanded && (existingReminders.length === 0 && pendingReminders.length === 0) && (
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
                entityType="event"
                entityId={event?.id || null}
                disabled={readOnly || saving}
                pendingReminders={pendingReminders}
                onPendingRemindersChange={(reminders) => {
                  setPendingReminders(reminders);
                }}
                onRemindersChange={handleRemindersChange}
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

                      // Check if reminder already exists (check both pending and existing)
                      const allReminders = [
                        ...pendingReminders.map(r => r.offset_minutes),
                        ...existingReminders.map(r => r.offset_minutes),
                      ];
                      if (allReminders.includes(offsetMinutes)) {
                        setCustomReminderValue('');
                        setShowCustomReminderInput(false);
                        return;
                      }

                      if (event?.id) {
                        // For existing events, create reminder directly
                        if (user) {
                          createReminder(user.id, {
                            entity_type: 'event',
                            entity_id: event.id,
                            offset_minutes: offsetMinutes,
                            notify_owner: true,
                            notify_attendees: false,
                          }).then(() => {
                            loadReminders(event.id);
                            setCustomReminderValue('');
                            setShowCustomReminderInput(false);
                          }).catch((err) => {
                            console.error('[PersonalEventModal] Error creating custom reminder:', err);
                            setError(err instanceof Error ? err.message : 'Failed to create reminder');
                          });
                        }
                      } else {
                        // For new events, add to pending reminders
                        setPendingReminders([
                          ...pendingReminders,
                          { offset_minutes: offsetMinutes, notify_owner: true, notify_attendees: false },
                        ].sort((a, b) => a.offset_minutes - b.offset_minutes));
                        setCustomReminderValue('');
                        setShowCustomReminderInput(false);
                      }
                    }}
                    disabled={!customReminderValue || isNaN(parseInt(customReminderValue, 10)) || parseInt(customReminderValue, 10) < 0 || readOnly || saving}
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

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="allDay"
          checked={allDay}
          onChange={(e) => setAllDay(e.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="allDay" className="text-sm font-medium text-gray-700">
          All-day event
        </label>
      </div>

      <EventTypeSelector
        value={eventType}
        onChange={setEventType}
        disabled={isIntegrated || isContextEvent}
      />

      <div className={`${isMobile ? 'grid grid-cols-1' : 'grid grid-cols-2'} gap-4`}>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Start Date <span className="text-red-500">*</span>
          </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                // Auto-update end date when start date changes (only for new events)
                if (!event && !allDay && e.target.value) {
                  const { endDate, endTime } = calculateEndDateTime(e.target.value, startTime || getDefaultStartTime());
                  setEndDate(endDate);
                  if (endTime) setEndTime(endTime);
                }
              }}
              required
              disabled={readOnly}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
        </div>

        {!allDay && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => {
                setStartTime(e.target.value);
                // Auto-update end time when start time changes (only for new events)
                if (!event && e.target.value && startDate) {
                  const { endDate, endTime } = calculateEndDateTime(startDate, e.target.value);
                  setEndDate(endDate);
                  if (endTime) setEndTime(endTime);
                }
              }}
              disabled={readOnly}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
        )}
      </div>

      <div className={`${isMobile ? 'grid grid-cols-1' : 'grid grid-cols-2'} gap-4`}>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            disabled={readOnly}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>

        {!allDay && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              disabled={readOnly}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
        )}
      </div>

      {canIntegrateWithGuardrails && !readOnly && (
        <div className="border-t border-gray-200 pt-6">
          <label className="block text-sm font-medium text-gray-900 mb-3">
            Should this affect your work projects?
          </label>
          <div className="space-y-2">
            <label className="flex items-start gap-3 cursor-pointer group p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="integrationType"
                value="personal"
                checked={integrationType === 'personal'}
                onChange={(e) => setIntegrationType(e.target.value as IntegrationType)}
                disabled={readOnly}
                className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900">Personal only</span>
                <p className="text-xs text-gray-500 mt-0.5">
                  Keep this event private (default)
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="integrationType"
                value="roadmap_event"
                checked={integrationType === 'roadmap_event'}
                onChange={(e) => setIntegrationType(e.target.value as IntegrationType)}
                disabled={readOnly}
                className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900">
                  Add to Guardrails as Roadmap Event
                </span>
                <p className="text-xs text-gray-500 mt-0.5">
                  Create a work commitment with dates
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="integrationType"
                value="task"
                checked={integrationType === 'task'}
                onChange={(e) => setIntegrationType(e.target.value as IntegrationType)}
                disabled={readOnly}
                className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900">
                  Add to Guardrails as Task
                </span>
                <p className="text-xs text-gray-500 mt-0.5">
                  Create a task with this as the deadline
                </p>
              </div>
            </label>
          </div>

          {integrationType !== 'personal' && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800">
                Note: Guardrails integration is not yet implemented. Your event will be created
                as personal-only for now.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tasks Section - Only show when editing an existing event */}
      {isEditing && event && (
        <div className="border-t border-gray-200 pt-6">
          <label className="block text-sm font-medium text-gray-900 mb-3">
            Tasks
          </label>
          
          {/* Add Task Input - Hidden in read-only mode */}
          {!readOnly && (
            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTask();
                  }
                }}
                placeholder="Add a task..."
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={handleAddTask}
                disabled={!newTaskTitle.trim()}
                className="px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              >
                <Plus size={16} />
                Add
              </button>
            </div>
          )}

          {/* Tasks List */}
          {loadingTasks ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : tasks.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No tasks yet. Add one above.</p>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => {
                const isCompleted = task.completed || (task.progress ?? 0) === 100;
                const progress = task.progress ?? 0;
                
                return (
                  <div
                    key={task.id}
                    className={`p-3 rounded-lg border transition-colors group ${
                      isCompleted
                        ? 'bg-gray-50 border-gray-200'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {/* Top Row: Checkbox + Title + Delete */}
                    <div className="flex items-center gap-3 mb-2">
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleTask(task);
                        }}
                        disabled={readOnly}
                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
                      >
                        {isCompleted ? (
                          <CheckSquare size={20} className="text-green-600" />
                        ) : (
                          <Square size={20} className="text-gray-400" />
                        )}
                      </button>

                      {/* Task Title - Clickable to open edit modal */}
                      <button
                        type="button"
                        onClick={() => {
                          if (!readOnly) {
                            setSelectedTask(task);
                            setIsTaskEditModalOpen(true);
                          }
                        }}
                        className={`flex-1 text-left text-sm px-2 py-1 rounded hover:bg-gray-100 transition-colors ${
                          isCompleted ? 'line-through text-gray-500' : 'text-gray-900'
                        } ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
                        disabled={readOnly}
                      >
                        {task.title}
                      </button>

                      {/* Delete Button - Hidden in read-only mode */}
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTask(task.id);
                          }}
                          className="flex-shrink-0 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
                          aria-label="Delete task"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>

                    {/* Bottom Row: Progress Slider (Phase 6) - Hidden for completed tasks (progress = 100) */}
                    {!isCompleted && progress < 100 ? (
                      <div className="pl-11 pr-1">
                        <TaskProgressSlider
                          taskId={task.id}
                          currentProgress={progress}
                          onProgressChange={handleProgressChange}
                          disabled={readOnly}
                          size="sm"
                          showLabel={true}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Members/Invitations Section - Hidden in read-only mode */}
      {!readOnly && (
        <div className="border-t border-gray-200 pt-6">
          <label className="block text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-400" />
            Attendees
          </label>

          {/* Current Members */}
          {loadingMembers ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : members.length > 0 ? (
            <div className="space-y-2 mb-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {member.name}
                      </span>
                    </div>
                    {member.email && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{member.email}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(member.id)}
                    className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label="Remove attendee"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 mb-4">No attendees yet. Add people below.</p>
          )}

          {/* Search/Add Members */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  placeholder="Search contacts or users..."
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Search Results */}
            {memberSearchQuery.trim() && (
              <div className="bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {searchingMembers ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                ) : memberSearchResults.length > 0 ? (
                  <div className="py-2">
                    {memberSearchResults.map((result) => (
                      <button
                        key={`${result.id}-${result.isContact}`}
                        type="button"
                        onClick={() => handleAddMember(result)}
                        disabled={members.some(m => m.id === result.id) || !result.isUser}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {result.name}
                          </div>
                          {result.email && (
                            <div className="text-xs text-gray-500 truncate">{result.email}</div>
                          )}
                        </div>
                        {members.some(m => m.id === result.id) && (
                          <span className="text-xs text-blue-600 flex-shrink-0">Added</span>
                        )}
                        {!result.isUser && (
                          <span className="text-xs text-gray-500 flex-shrink-0">Contact only</span>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-500 text-center">
                    No contacts or users found. Try inviting by email below.
                  </div>
                )}
              </div>
            )}

            {/* Invite by Email */}
            {!showInviteEmailInput ? (
              <button
                type="button"
                onClick={() => setShowInviteEmailInput(true)}
                className="w-full px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Invite by Email
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleInviteByEmail();
                    } else if (e.key === 'Escape') {
                      setInviteEmail('');
                      setShowInviteEmailInput(false);
                    }
                  }}
                  placeholder="Enter email address"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleInviteByEmail}
                  disabled={!inviteEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim())}
                  className="px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Send
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInviteEmail('');
                    setShowInviteEmailInput(false);
                  }}
                  className="px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );

  // Mobile: Bottom Sheet (Full-height 80-90vh per audit)
  if (isMobile) {
    const header = (
      <div className="flex items-center gap-3 flex-1">
        <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0" />
        <div className="flex-1">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-2 py-1 text-base font-semibold text-gray-900 border-0 border-b-2 border-transparent focus:border-blue-500 focus:outline-none bg-transparent"
            placeholder="Event title"
          />
        </div>
        {isIntegrated && (
          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded flex items-center gap-1 flex-shrink-0">
            <LinkIcon className="w-3 h-3" />
            Linked
          </span>
        )}
        {isContextEvent && event && (
          <div className="flex-shrink-0">
            <PermissionIndicator
              entityType="calendar_event"
              entityId={event.id}
              flags={event.permissions}
              canManage={canManageEvent}
            />
          </div>
        )}
      </div>
    );

    // Footer with action buttons - add bottom padding on mobile to account for fixed bottom nav
    const footer = (
      <div className={`flex flex-col gap-3 w-full ${isMobile ? 'pb-20' : ''}`}>
        {isEditing && !readOnly && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || saving}
            className="w-full px-4 py-3 text-red-600 font-medium bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
          >
            {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
            <Trash2 size={18} />
            Delete Event
          </button>
        )}
        <div className="flex gap-3 w-full">
          {isContextEvent && canManageEvent && !readOnly && (
            <button
              onClick={openSharing}
              className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 active:scale-[0.98] transition-all font-medium flex items-center justify-center gap-2 min-h-[44px] flex-shrink-0"
              type="button"
            >
              <Share2 size={18} />
              Share
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={saving || deleting}
            className={`${readOnly ? "w-full" : "flex-1"} px-4 py-3 text-gray-700 font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 active:scale-[0.98] transition-all min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {readOnly ? 'Close' : 'Cancel'}
          </button>
          {!readOnly && (
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={saving || deleting || !title || !startDate}
              className="flex-1 px-4 py-3 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditing ? 'Save' : 'Create'}
            </button>
          )}
        </div>
      </div>
    );

    return (
      <>
        <BottomSheet
          isOpen={true}
          onClose={onClose}
          header={header}
          footer={footer}
          maxHeight="90vh"
          closeOnBackdrop={!saving}
          preventClose={saving}
        >
          <div className="px-4 py-4 space-y-4">
            {renderFormContent()}
          </div>
        </BottomSheet>

        {sharingAdapter && (
          <SharingDrawer
            adapter={sharingAdapter}
            isOpen={isSharingOpen}
            onClose={closeSharing}
          />
        )}

        <ConfirmDialogInline
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={confirmDelete}
          title="Delete Event"
          message="Are you sure you want to delete this event? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          confirmVariant="danger"
          loading={deleting}
        />

        {/* Task Edit Modal */}
        {selectedTask && (
          <TaskEditModal
            userId={userId}
            task={selectedTask}
            isOpen={isTaskEditModalOpen}
            onClose={() => {
              setIsTaskEditModalOpen(false);
              setSelectedTask(null);
            }}
            onSaved={() => {
              if (event) {
                loadTasks(event.id);
              }
              setIsTaskEditModalOpen(false);
              setSelectedTask(null);
            }}
            onDeleted={() => {
              if (event) {
                loadTasks(event.id);
              }
            }}
            readOnly={readOnly}
          />
        )}
      </>
    );
  }

  // Desktop: Centered modal (unchanged)
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Calendar className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? 'Edit Event' : 'New Event'}
            </h2>
            {isIntegrated && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded flex items-center gap-1">
                <LinkIcon className="w-3 h-3" />
                Linked to Guardrails
              </span>
            )}
            {isContextEvent && event && (
              <PermissionIndicator
                entityType="calendar_event"
                entityId={event.id}
                flags={event.permissions}
                canManage={canManageEvent}
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            {isContextEvent && canManageEvent && (
              <button
                onClick={openSharing}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                type="button"
              >
                <Share2 size={16} />
                Share
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {sharingAdapter && (
          <SharingDrawer
            adapter={sharingAdapter}
            isOpen={isSharingOpen}
            onClose={closeSharing}
          />
        )}

        <ConfirmDialogInline
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={confirmDelete}
          title="Delete Event"
          message="Are you sure you want to delete this event? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          confirmVariant="danger"
          loading={deleting}
        />

        {/* Task Edit Modal */}
        {selectedTask && (
          <TaskEditModal
            userId={userId}
            task={selectedTask}
            isOpen={isTaskEditModalOpen}
            onClose={() => {
              setIsTaskEditModalOpen(false);
              setSelectedTask(null);
            }}
            onSaved={() => {
              if (event) {
                loadTasks(event.id);
              }
              setIsTaskEditModalOpen(false);
              setSelectedTask(null);
            }}
            onDeleted={() => {
              if (event) {
                loadTasks(event.id);
              }
            }}
            readOnly={readOnly}
          />
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Read-only indicator */}
          {readOnly && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 font-medium">
                You are viewing this event in read-only mode.
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={readOnly}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Meeting with team"
            />
          </div>

          {renderFormContent()}

          <div className="flex flex-col gap-3 pt-4 border-t border-gray-200">
            {isEditing && !readOnly && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || saving}
                className="w-full px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                <Trash2 size={16} />
                Delete Event
              </button>
            )}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={saving || deleting}
                className={`${readOnly ? "w-full" : ""} px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {readOnly ? 'Close' : 'Cancel'}
              </button>
              {!readOnly && (
                <button
                  type="submit"
                  disabled={saving || deleting || !title || !startDate}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isEditing ? 'Save Changes' : 'Create Event'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
