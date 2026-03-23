/**
 * Shared Event Detail Modal
 * 
 * Unified event detail view used across:
 * - Planner Month View
 * - Planner Week View
 * - Planner Day View
 * - Personal Spaces Calendar
 * 
 * Respects PermissionFlags for visibility, detail redaction, and editability.
 */

import { useState, useEffect } from 'react';
import { X, Edit2, Trash2, Lock, Share2, Calendar, Clock, MapPin, Eye, EyeOff, Repeat } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { showToast } from '../Toast';
import { ConfirmDialogInline } from '../ConfirmDialogInline';
import { PersonalCalendarEvent } from '../../lib/personalSpaces/calendarService';
import { updatePersonalCalendarEvent, deletePersonalCalendarEvent } from '../../lib/personalSpaces/calendarService';
import { deleteContextEvent } from '../../lib/contextSovereign/contextEventsService';
import { assertCanEdit, PermissionError } from '../../lib/permissions/enforcement';
import { deleteHabitInstanceFromCalendar } from '../../lib/habits/habitsService';
import { FEATURE_CALENDAR_EXTRAS, FEATURE_CONTEXT_TAGGING } from '../../lib/featureFlags';
import { useSharingDrawer } from '../../hooks/useSharingDrawer';
import { SharingDrawer } from '../sharing/SharingDrawer';
import { PermissionIndicator } from '../sharing/PermissionIndicator';
import { PersonalEventModal } from '../personal-spaces/PersonalEventModal';
import { TagPicker } from '../tags/TagPicker';
import type { PermissionFlags } from '../../lib/permissions/types';
import { BottomSheet } from '../shared/BottomSheet';

export type EventDetailModalMode = 'month' | 'week' | 'day' | 'personalSpaces';

export interface EventDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: PersonalCalendarEvent;
  mode: EventDetailModalMode;
  userId: string;
  onUpdated?: () => void;
  onDeleted?: () => void;
}

export function EventDetailModal({
  isOpen,
  onClose,
  event,
  mode,
  userId,
  onUpdated,
  onDeleted,
}: EventDetailModalProps) {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const permissions = event.permissions;
  const canEdit = permissions?.can_edit ?? true;
  const canManage = permissions?.can_manage ?? false;
  const canView = permissions?.can_view ?? true;
  const detailLevel = permissions?.detail_level ?? 'detailed';
  const isReadOnly = !canEdit;
  const isContextEvent = event.sourceType === 'context';
  const isOwner = event.userId === userId;

  // Sharing drawer (only for context events)
  const { isOpen: isSharingOpen, adapter: sharingAdapter, openDrawer: openSharing, closeDrawer: closeSharing } = useSharingDrawer(
    'calendar_event',
    isContextEvent ? event.id : null
  );

  if (!isOpen || !canView) {
    return null;
  }

  const handleEdit = () => {
    setIsEditing(true);
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    // Phase 7A: Show inline confirmation dialog
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    setError(null);

    try {
      assertCanEdit(permissions, 'event');

      // Check if this is a derived habit instance
      const isDerivedHabit = FEATURE_CALENDAR_EXTRAS && 
        (event as any).is_derived_instance === true && 
        (event as any).derived_type === 'habit_instance' &&
        (event as any).activity_id;

      if (isDerivedHabit) {
        // For habit instances, mark as skipped (soft delete)
        const activityId = (event as any).activity_id;
        const localDate = (event as any).local_date || event.startAt.split('T')[0];
        await deleteHabitInstanceFromCalendar(userId, activityId, localDate, 'skipped');
      } else if (isContextEvent && event.sourceEntityId) {
        const result = await deleteContextEvent(event.sourceEntityId);
        if (!result.success) {
          throw new Error(result.error);
        }
      } else {
        await deletePersonalCalendarEvent(userId, event.id);
      }

      onDeleted?.();
      onClose();
    } catch (err) {
      console.error('Error deleting event:', err);
      if (err instanceof PermissionError) {
        setError('You do not have permission to delete this event');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to delete event');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleGoToDay = () => {
    const eventDate = new Date(event.startAt);
    navigate('/planner/daily', {
      state: { date: eventDate.toISOString() },
    });
    onClose();
  };

  const handleGoToWeek = () => {
    const eventDate = new Date(event.startAt);
    navigate('/planner/weekly', {
      state: { date: eventDate.toISOString() },
    });
    onClose();
  };

  // Navigate to habit tracker for habit events
  const handleGoToHabit = async () => {
    if (event.event_type !== 'habit' || !(event as any).activity_id) {
      return;
    }

    try {
      // Find habit tracker
      const { listTrackers } = await import('../../lib/trackerStudio/trackerService');
      const { isHabitTracker } = await import('../../lib/trackerStudio/habitTrackerUtils');
      const trackers = await listTrackers(false);
      const habitTracker = trackers.find(t => isHabitTracker(t));

      if (!habitTracker) {
        // Fallback: navigate to tracker studio
        navigate('/tracker-studio/my-trackers');
        onClose();
        return;
      }

      const eventDate = new Date(event.startAt);
      const dateStr = eventDate.toISOString().split('T')[0];
      const habitId = (event as any).activity_id;

      // Navigate to habit tracker with date and habit context
      navigate(`/tracker-studio/tracker/${habitTracker.id}`, {
        state: {
          date: dateStr,
          habit_id: habitId,
        },
      });
      onClose();
    } catch (error) {
      console.error('[EventDetailModal] Error navigating to habit tracker:', error);
      // Fallback: navigate to tracker studio
      navigate('/tracker-studio/my-trackers');
      onClose();
    }
  };

  const handleSaved = () => {
    setIsEditing(false);
    onUpdated?.();
  };

  // Permission banner text
  const getPermissionBanner = () => {
    if (!permissions) return null;

    if (isOwner) {
      return { text: 'Private', icon: Lock, color: 'text-gray-600' };
    }

    if (isReadOnly) {
      return { text: 'Read-only', icon: Lock, color: 'text-orange-600' };
    }

    if (detailLevel === 'overview') {
      return { text: 'Shared (overview)', icon: EyeOff, color: 'text-blue-600' };
    }

    if (detailLevel === 'detailed') {
      return { text: 'Shared (detailed)', icon: Eye, color: 'text-blue-600' };
    }

    return { text: 'Shared', icon: Share2, color: 'text-blue-600' };
  };

  const permissionBanner = getPermissionBanner();

  // Format date/time
  const startDate = new Date(event.startAt);
  const endDate = event.endAt ? new Date(event.endAt) : null;
  const isAllDay = event.allDay;
  const isMultiDay = endDate && (
    startDate.toDateString() !== endDate.toDateString()
  );

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Show edit modal if editing
  if (isEditing) {
    return (
      <PersonalEventModal
        userId={userId}
        event={event}
        onClose={() => setIsEditing(false)}
        onSaved={handleSaved}
      />
    );
  }

  // Render event content (shared between mobile and desktop)
  const renderEventContent = () => (
    <>
      {/* Date/Time */}
      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <Calendar size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-700">Date & Time</div>
            <div className="text-sm text-gray-900 mt-1">
              {isAllDay ? (
                <>
                  {formatDate(startDate)}
                  {isMultiDay && endDate && (
                    <> - {formatDate(endDate)}</>
                  )}
                  <span className="text-gray-500 ml-2">(All day)</span>
                </>
              ) : (
                <>
                  {formatDate(startDate)} at {formatTime(startDate)}
                  {endDate && (
                    <> - {formatTime(endDate)}</>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Description (redacted if overview) */}
      {detailLevel === 'detailed' && event.description && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700">Description</div>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{event.description}</p>
        </div>
      )}

      {detailLevel === 'overview' && (
        <div className="text-sm text-gray-500 italic">
          Detailed information is not available with your current access level.
        </div>
      )}

      {/* Tags (read-only display) */}
      {FEATURE_CONTEXT_TAGGING && event.is_derived_instance && event.activity_id && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700">Tags</div>
          <TagPicker
            userId={userId}
            entityType={
              event.derived_type === 'habit_instance' ? 'habit' :
              event.derived_type === 'goal_marker' ? 'goal' :
              'activity'
            }
            entityId={event.activity_id}
            permissions={{
              ...permissions,
              can_edit: false, // Read-only in calendar
              can_manage: false,
            }}
            compact={true}
          />
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      {/* Navigation Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-gray-100 flex-wrap">
        {/* Habit Navigation (if habit event) */}
        {event.event_type === 'habit' && (event as any).activity_id && (
          <button
            onClick={handleGoToHabit}
            className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5"
          >
            <Repeat size={14} />
            View Habit
          </button>
        )}
        
        {/* Calendar Navigation */}
        {mode !== 'day' && (
          <>
            <button
              onClick={handleGoToDay}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Clock size={14} />
              Go to Day View
            </button>
            {mode !== 'week' && (
              <button
                onClick={handleGoToWeek}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Calendar size={14} />
                Go to Week View
              </button>
            )}
          </>
        )}
      </div>
    </>
  );

  // Render header (shared between mobile and desktop)
  const renderHeader = () => (
    <div className="flex-1 min-w-0">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-900 mb-2 truncate`}>{event.title}</h2>
      
      {/* Time display in header for mobile */}
      {isMobile && (
        <div className="text-sm text-gray-600 mb-2">
          {isAllDay ? (
            <>
              {formatDate(startDate)}
              {isMultiDay && endDate && <> - {formatDate(endDate)}</>}
              <span className="text-gray-500 ml-2">(All day)</span>
            </>
          ) : (
            <>
              {formatDate(startDate)} at {formatTime(startDate)}
              {endDate && <> - {formatTime(endDate)}</>}
            </>
          )}
        </div>
      )}
      
      {/* Permission Banner */}
      {permissionBanner && (
        <div className={`flex items-center gap-1.5 text-sm ${permissionBanner.color} mb-2`}>
          <permissionBanner.icon size={14} />
          <span>{permissionBanner.text}</span>
          {isContextEvent && <Share2 size={12} className="ml-1" />}
        </div>
      )}

      {/* Source Badge */}
      <div className="flex items-center gap-2 flex-wrap">
        {event.contextType && (
          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
            {event.contextType}
          </span>
        )}
        {event.sourceType === 'guardrails' && (
          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
            Guardrails
          </span>
        )}
        {event.event_scope === 'container' && (
          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
            Container
          </span>
        )}
        {event.event_scope === 'item' && (
          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
            Nested
          </span>
        )}
      </div>
    </div>
  );

  // Render footer actions (shared between mobile and desktop)
  const renderFooter = () => (
    <div className="flex items-center gap-2 flex-wrap">
      {canEdit && (
        <button
          onClick={handleEdit}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 min-h-[44px] flex-1 justify-center"
        >
          <Edit2 size={16} />
          Edit
        </button>
      )}
      {canManage && (
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 min-h-[44px] flex-1 justify-center"
        >
          <Trash2 size={16} />
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      )}
      {isContextEvent && isOwner && (
        <button
          onClick={openSharing}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 min-h-[44px] flex-1 justify-center"
        >
          <Share2 size={16} />
          Share
        </button>
      )}
      {!canEdit && (
        <div className="flex items-center gap-2 text-sm text-gray-500 w-full justify-center">
          <Lock size={14} />
          <span>Read-only access</span>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Phase 7A: Inline delete confirmation */}
      <ConfirmDialogInline
        isOpen={showDeleteConfirm}
        message="Are you sure you want to delete this event? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* Mobile: Use BottomSheet */}
      {isMobile ? (
        <BottomSheet
          isOpen={isOpen}
          onClose={onClose}
          title={event.title}
          header={renderHeader()}
          footer={renderFooter()}
          maxHeight="90vh"
        >
          <div className="space-y-4">
            {renderEventContent()}
          </div>
        </BottomSheet>
      ) : (
        /* Desktop: Use existing modal */
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-start justify-between z-10">
              {renderHeader()}
              {/* Phase 2D: Ensure close button is reachable and clear */}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 active:text-gray-700 ml-4 flex-shrink-0 p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Close event details"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-4 space-y-4">
              {renderEventContent()}
              
              {/* Actions (desktop: inline) */}
              <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                {canEdit && (
                  <button
                    onClick={handleEdit}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Edit2 size={16} />
                    Edit
                  </button>
                )}
                {canManage && (
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Trash2 size={16} />
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                )}
                {isContextEvent && isOwner && (
                  <button
                    onClick={openSharing}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                  >
                    <Share2 size={16} />
                    Share
                  </button>
                )}
                {!canEdit && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Lock size={14} />
                    <span>Read-only access</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sharing Drawer */}
      {isSharingOpen && sharingAdapter && (
        <SharingDrawer
          adapter={sharingAdapter}
          isOpen={isSharingOpen}
          onClose={closeSharing}
        />
      )}
    </>
  );
}

