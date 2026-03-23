/**
 * Calendar Sync Panel (Reusable)
 * 
 * Phase 2/3/4/5: Reusable calendar sync panel for project, track, subtrack, and event levels.
 * 
 * Supports:
 * - level="project" (Phase 2) ✅
 * - level="track" (Phase 3) ✅
 * - level="subtrack" (Phase 4) ✅
 * - level="event" (Phase 5) ✅
 * 
 * TODO (Future Phases):
 * - Phase 6: Wire resolver into sync execution logic
 * - Phase 7: Shared calendar projections implementation
 * - Entity type filters UI (roadmap_events, tasks, mindmesh_events)
 */

import { useState, useEffect } from 'react';
import { Calendar, Info, AlertTriangle, Eye, CheckCircle2, X } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import {
  getProjectSyncSettings,
  upsertProjectSyncSettings,
  deleteProjectSyncSettings,
  getTrackSyncSettings,
  upsertTrackSyncSettings,
  deleteTrackSyncSettings,
  getSubtrackSyncSettings,
  upsertSubtrackSyncSettings,
  deleteSubtrackSyncSettings,
  getEventSyncSettings,
  upsertEventSyncSettings,
  deleteEventSyncSettings,
} from '../../../lib/guardrails/calendarSync/syncSettingsService';
import { resolveEffectiveCalendarSync } from '../../../lib/guardrails/calendarSync/syncSettingsResolver';
import { getCalendarSyncSettings } from '../../../lib/calendarSyncSettings';
import { getSharedSpaces } from '../../../lib/household';
import type {
  ProjectCalendarSyncSettings,
  TrackCalendarSyncSettings,
  SubtrackCalendarSyncSettings,
  EventCalendarSyncSettings,
  TargetCalendarType,
  SyncableEntityType,
  CreateProjectSyncSettingsInput,
  CreateTrackSyncSettingsInput,
  CreateSubtrackSyncSettingsInput,
  CreateEventSyncSettingsInput,
} from '../../../lib/guardrails/calendarSync/types';
import { getTimelineEligibleItems, getRoadmapItemsByTrack, getRoadmapItemsBySubtrack, getRoadmapItem } from '../../../lib/guardrails/roadmapService';
import type { RoadmapItem } from '../../../lib/guardrailsTypes';
import { showToast } from '../../Toast';

type SyncLevel = 'project' | 'track' | 'subtrack' | 'event';

interface CalendarSyncPanelProps {
  level: SyncLevel;
  projectId: string;
  projectName: string;
  trackId?: string;
  trackName?: string;
  subtrackId?: string;
  subtrackName?: string;
  eventId?: string;
  entityType?: SyncableEntityType;
  eventName?: string;
  showDefaultState?: boolean; // For event level: show calm inheritance state by default
}

interface SharedSpace {
  id: string;
  name: string;
}

export function CalendarSyncPanel({
  level,
  projectId,
  projectName,
  trackId,
  trackName,
  subtrackId,
  subtrackName,
  eventId,
  entityType = 'roadmap_event',
  eventName,
  showDefaultState = false,
}: CalendarSyncPanelProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projectSettings, setProjectSettings] = useState<ProjectCalendarSyncSettings | null>(null);
  const [trackSettings, setTrackSettings] = useState<TrackCalendarSyncSettings | null>(null);
  const [subtrackSettings, setSubtrackSettings] = useState<SubtrackCalendarSyncSettings | null>(null);
  const [eventSettings, setEventSettings] = useState<EventCalendarSyncSettings | null>(null);
  const [globalSettings, setGlobalSettings] = useState<any>(null);
  const [showOverrideControls, setShowOverrideControls] = useState(!showDefaultState);
  const [sharedSpaces, setSharedSpaces] = useState<SharedSpace[]>([]);
  const [effectiveSync, setEffectiveSync] = useState<any>(null);

  // UI State
  const [showSharedConfirm, setShowSharedConfirm] = useState(false);
  const [showEnableConfirm, setShowEnableConfirm] = useState(false);
  const [showUnsyncConfirm, setShowUnsyncConfirm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewEvents, setPreviewEvents] = useState<RoadmapItem[]>([]);

  // Form state
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [targetCalendar, setTargetCalendar] = useState<TargetCalendarType>('personal');
  const [targetSpaceId, setTargetSpaceId] = useState<string | null>(null);
  const [inheritFromParent, setInheritFromParent] = useState(true);

  useEffect(() => {
    if (user && projectId && (
      level === 'project' || 
      (level === 'track' && trackId) ||
      (level === 'subtrack' && trackId && subtrackId) ||
      (level === 'event' && eventId)
    )) {
      loadData();
    }
  }, [user, projectId, trackId, subtrackId, eventId, level]);

  async function loadData() {
    if (!user) return;

    try {
      setLoading(true);

      // Load project settings (for inheritance display)
      const projSettings = await getProjectSyncSettings(user.id, projectId);
      setProjectSettings(projSettings);

      // Load track settings (if track or subtrack level)
      if ((level === 'track' || level === 'subtrack') && trackId) {
        const trkSettings = await getTrackSyncSettings(user.id, projectId, trackId);
        setTrackSettings(trkSettings);
      }

      // Load subtrack settings (if subtrack or event level)
      if ((level === 'subtrack' || level === 'event') && trackId && subtrackId) {
        const subtrkSettings = await getSubtrackSyncSettings(user.id, projectId, trackId, subtrackId);
        setSubtrackSettings(subtrkSettings);
      }

      // Load event settings (if event level)
      if (level === 'event' && eventId) {
        const evtSettings = await getEventSyncSettings(user.id, projectId, eventId, entityType);
        setEventSettings(evtSettings);
      }

      // Load global settings (for inheritance display)
      try {
        const global = await getCalendarSyncSettings(user.id);
        setGlobalSettings(global);
      } catch (error) {
        // Global settings might not exist - that's okay
        console.log('[CalendarSyncPanel] Global settings not found');
      }

      // Load shared spaces
      const spaces = await getSharedSpaces();
      setSharedSpaces(spaces.map(s => ({ id: s.id, name: s.name })));

      // Calculate effective sync
      const effective = await resolveEffectiveCalendarSync(user.id, {
        projectId,
        trackId: (level === 'track' || level === 'subtrack' || level === 'event') ? trackId : undefined,
        subtrackId: (level === 'subtrack' || level === 'event') ? subtrackId : undefined,
        eventId: level === 'event' ? eventId : undefined,
        entityType: level === 'event' ? entityType : 'roadmap_event',
      });
      setEffectiveSync(effective);

      // Set form state
      if (level === 'event' && eventId) {
        if (eventSettings) {
          // Check inheritance flags - event can inherit from subtrack, track, or project
          const inheritsFromSubtrack = eventSettings.inherit_from_subtrack !== false && subtrackId;
          const inheritsFromTrack = eventSettings.inherit_from_track !== false && trackId;
          const inheritsFromProject = eventSettings.inherit_from_project !== false;
          
          if (!inheritsFromSubtrack && !inheritsFromTrack && !inheritsFromProject) {
            // Explicitly set at event level
            setSyncEnabled(eventSettings.sync_enabled);
            setTargetCalendar(eventSettings.target_calendar_type);
            setTargetSpaceId(eventSettings.target_space_id);
            setInheritFromParent(false);
          } else {
            // Inheriting - use effective sync
            setSyncEnabled(effective?.shouldSync || false);
            setTargetCalendar(effective?.targetCalendar || 'personal');
            setTargetSpaceId(effective?.targetSpaceId || null);
            setInheritFromParent(true);
          }
        } else {
          // No event settings - inheriting from parent
          setSyncEnabled(effective?.shouldSync || false);
          setTargetCalendar(effective?.targetCalendar || 'personal');
          setTargetSpaceId(effective?.targetSpaceId || null);
          setInheritFromParent(true);
        }
      } else if (level === 'subtrack' && trackId && subtrackId) {
        if (subtrackSettings) {
          setSyncEnabled(subtrackSettings.sync_enabled);
          setTargetCalendar(subtrackSettings.target_calendar_type);
          setTargetSpaceId(subtrackSettings.target_space_id);
          setInheritFromParent(subtrackSettings.inherit_from_track);
        } else {
          // No subtrack settings - defaults: OFF, personal, inherit from track
          setSyncEnabled(false);
          setTargetCalendar('personal');
          setTargetSpaceId(null);
          setInheritFromParent(true);
        }
      } else if (level === 'track' && trackId) {
        if (trackSettings) {
          setSyncEnabled(trackSettings.sync_enabled);
          setTargetCalendar(trackSettings.target_calendar_type);
          setTargetSpaceId(trackSettings.target_space_id);
          setInheritFromParent(trackSettings.inherit_from_project);
        } else {
          // No track settings - defaults: OFF, personal, inherit from project
          setSyncEnabled(false);
          setTargetCalendar('personal');
          setTargetSpaceId(null);
          setInheritFromParent(true);
        }
      } else if (level === 'project') {
        if (projSettings) {
          setSyncEnabled(projSettings.sync_enabled);
          setTargetCalendar(projSettings.target_calendar_type);
          setTargetSpaceId(projSettings.target_space_id);
          setInheritFromParent(projSettings.inherit_from_global);
        } else {
          // No project settings - defaults: OFF, personal, inherit from global
          setSyncEnabled(false);
          setTargetCalendar('personal');
          setTargetSpaceId(null);
          setInheritFromParent(true);
        }
      }
    } catch (error) {
      console.error('[CalendarSyncPanel] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!user) return;

    try {
      setSaving(true);

      if (level === 'event' && eventId && trackId) {
        const input: CreateEventSyncSettingsInput = {
          user_id: user.id,
          project_id: projectId,
          event_id: eventId,
          entity_type: entityType,
          track_id: trackId,
          subtrack_id: subtrackId || null,
          sync_enabled: syncEnabled,
          target_calendar_type: targetCalendar,
          target_space_id: targetSpaceId,
          // Set inheritance flags based on whether we're inheriting
          inherit_from_subtrack: subtrackId ? (inheritFromParent ? true : false) : null,
          inherit_from_track: inheritFromParent ? true : false,
          inherit_from_project: inheritFromParent ? true : false,
        };

        const saved = await upsertEventSyncSettings(input);
        setEventSettings(saved);
      } else if (level === 'subtrack' && trackId && subtrackId) {
        const input: CreateSubtrackSyncSettingsInput = {
          user_id: user.id,
          project_id: projectId,
          track_id: trackId,
          subtrack_id: subtrackId,
          sync_enabled: syncEnabled,
          target_calendar_type: targetCalendar,
          target_space_id: targetSpaceId,
          inherit_from_track: inheritFromParent,
          sync_roadmap_events: true,
          sync_tasks_with_dates: true,
          sync_mindmesh_events: true,
        };

        const saved = await upsertSubtrackSyncSettings(input);
        setSubtrackSettings(saved);
      } else if (level === 'track' && trackId) {
        const input: CreateTrackSyncSettingsInput = {
          user_id: user.id,
          project_id: projectId,
          track_id: trackId,
          sync_enabled: syncEnabled,
          target_calendar_type: targetCalendar,
          target_space_id: targetSpaceId,
          inherit_from_project: inheritFromParent,
          sync_roadmap_events: true,
          sync_tasks_with_dates: true,
          sync_mindmesh_events: true,
        };

        const saved = await upsertTrackSyncSettings(input);
        setTrackSettings(saved);
      } else if (level === 'project') {
        const input: CreateProjectSyncSettingsInput = {
          user_id: user.id,
          project_id: projectId,
          sync_enabled: syncEnabled,
          target_calendar_type: targetCalendar,
          target_space_id: targetSpaceId,
          inherit_from_global: inheritFromParent,
          sync_roadmap_events: true,
          sync_tasks_with_dates: true,
          sync_mindmesh_events: true,
        };

        const saved = await upsertProjectSyncSettings(input);
        setProjectSettings(saved);
      }

      // Recalculate effective sync
      const effective = await resolveEffectiveCalendarSync(user.id, {
        projectId,
        trackId: (level === 'track' || level === 'subtrack' || level === 'event') ? trackId : undefined,
        subtrackId: (level === 'subtrack' || level === 'event') ? subtrackId : undefined,
        eventId: level === 'event' ? eventId : undefined,
        entityType: level === 'event' ? entityType : 'roadmap_event',
      });
      setEffectiveSync(effective);

      // Phase 6/7/8: Execute calendar sync for affected events
      if (level === 'event' && eventId) {
        // Sync this specific event
        const { executeCalendarSyncForEvent } = await import('../../../lib/guardrails/calendarSync/calendarSyncExecution');
        await executeCalendarSyncForEvent(
          user.id,
          eventId,
          entityType,
          projectId,
          projectName, // Required for shared projections (Phase 7)
          trackId,
          subtrackId
        );
      } else {
        // Phase 8: Bulk sync for project/track/subtrack changes
        const {
          bulkSyncProjectRoadmapEvents,
          bulkSyncTrackRoadmapEvents,
          bulkSyncSubtrackRoadmapEvents,
        } = await import('../../../lib/guardrails/calendarSync/calendarSyncBulkPropagation');

        let bulkResult;
        if (level === 'project') {
          bulkResult = await bulkSyncProjectRoadmapEvents(user.id, projectId);
        } else if (level === 'track' && trackId) {
          bulkResult = await bulkSyncTrackRoadmapEvents(user.id, projectId, trackId);
        } else if (level === 'subtrack' && trackId && subtrackId) {
          bulkResult = await bulkSyncSubtrackRoadmapEvents(user.id, projectId, trackId, subtrackId);
        }

        if (bulkResult) {
          // Show result toast
          const messages: string[] = [];
          if (bulkResult.syncedCount > 0) {
            messages.push(`Synced ${bulkResult.syncedCount} event${bulkResult.syncedCount !== 1 ? 's' : ''}`);
          }
          if (bulkResult.unsyncedCount > 0) {
            messages.push(`Removed ${bulkResult.unsyncedCount} event${bulkResult.unsyncedCount !== 1 ? 's' : ''} from calendar`);
          }
          if (bulkResult.skippedCount > 0) {
            messages.push(`Skipped ${bulkResult.skippedCount} event${bulkResult.skippedCount !== 1 ? 's' : ''} with no dates`);
          }
          if (bulkResult.errorsCount > 0) {
            messages.push(`${bulkResult.errorsCount} error${bulkResult.errorsCount !== 1 ? 's' : ''} occurred`);
          }

          if (messages.length > 0) {
            showToast(messages.join(', '), bulkResult.errorsCount > 0 ? 'warning' : 'success');
          }
        }
      }
    } catch (error) {
      console.error('[CalendarSyncPanel] Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleUnsync() {
    if (!user) return;

    try {
      setSaving(true);
      
      if (level === 'event' && eventId) {
        await deleteEventSyncSettings(user.id, projectId, eventId, entityType);
        setEventSettings(null);
      } else if (level === 'subtrack' && trackId && subtrackId) {
        await deleteSubtrackSyncSettings(user.id, projectId, trackId, subtrackId);
        setSubtrackSettings(null);
      } else if (level === 'track' && trackId) {
        await deleteTrackSyncSettings(user.id, projectId, trackId);
        setTrackSettings(null);
      } else if (level === 'project') {
        await deleteProjectSyncSettings(user.id, projectId);
        setProjectSettings(null);
      }
      
      // Recalculate effective sync
      const effective = await resolveEffectiveCalendarSync(user.id, {
        projectId,
        trackId: (level === 'track' || level === 'subtrack' || level === 'event') ? trackId : undefined,
        subtrackId: (level === 'subtrack' || level === 'event') ? subtrackId : undefined,
        eventId: level === 'event' ? eventId : undefined,
        entityType: level === 'event' ? entityType : 'roadmap_event',
      });
      setEffectiveSync(effective);

      // Phase 6/8: Execute calendar sync for affected events
      if (level === 'event' && eventId) {
        // Unsync this specific event
        const { executeCalendarSyncForEvent } = await import('../../../lib/guardrails/calendarSync/calendarSyncExecution');
        await executeCalendarSyncForEvent(
          user.id,
          eventId,
          entityType,
          projectId,
          projectName,
          trackId,
          subtrackId
        );
      } else {
        // Phase 8: Bulk unsync for project/track/subtrack changes
        try {
          const {
            bulkSyncProjectRoadmapEvents,
            bulkSyncTrackRoadmapEvents,
            bulkSyncSubtrackRoadmapEvents,
          } = await import('../../../lib/guardrails/calendarSync/calendarSyncBulkPropagation');

          let bulkResult;
          if (level === 'project') {
            bulkResult = await bulkSyncProjectRoadmapEvents(user.id, projectId);
          } else if (level === 'track' && trackId) {
            bulkResult = await bulkSyncTrackRoadmapEvents(user.id, projectId, trackId);
          } else if (level === 'subtrack' && trackId && subtrackId) {
            bulkResult = await bulkSyncSubtrackRoadmapEvents(user.id, projectId, trackId, subtrackId);
          }

          if (bulkResult) {
            // Show result toast
            const messages: string[] = [];
            if (bulkResult.unsyncedCount > 0) {
              messages.push(`Removed ${bulkResult.unsyncedCount} event${bulkResult.unsyncedCount !== 1 ? 's' : ''} from calendar`);
            }
            if (bulkResult.syncedCount > 0) {
              messages.push(`Synced ${bulkResult.syncedCount} event${bulkResult.syncedCount !== 1 ? 's' : ''} (inherited from parent)`);
            }
            if (bulkResult.skippedCount > 0) {
              messages.push(`Skipped ${bulkResult.skippedCount} event${bulkResult.skippedCount !== 1 ? 's' : ''} with no dates`);
            }
            if (bulkResult.errorsCount > 0) {
              messages.push(`${bulkResult.errorsCount} error${bulkResult.errorsCount !== 1 ? 's' : ''} occurred`);
            }

            if (messages.length > 0) {
              showToast(messages.join(', '), bulkResult.errorsCount > 0 ? 'warning' : 'success');
            }
          }
        } catch (bulkError) {
          console.error('[CalendarSyncPanel] Error during bulk unsync:', bulkError);
          // Don't fail the unsync if bulk sync fails - settings are already deleted
          showToast('Sync disabled, but cleanup encountered errors', 'warning');
        }
      }

      setSyncEnabled(false);
      setTargetCalendar('personal');
      setTargetSpaceId(null);
      setInheritFromParent(true);
      setShowUnsyncConfirm(false);
    } catch (error) {
      console.error('[CalendarSyncPanel] Error unsyncing:', error);
      alert('Failed to unsync. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handlePreview() {
    if (!user) return;

    try {
      let items: RoadmapItem[] = [];
      
      if (level === 'event' && eventId) {
        // For event level, show only this event
        const event = await getRoadmapItem(eventId);
        items = event ? [event] : [];
      } else if (level === 'subtrack' && subtrackId) {
        // Fetch events for this subtrack only
        items = await getRoadmapItemsBySubtrack(subtrackId);
      } else if (level === 'track' && trackId) {
        // Fetch events for this track only
        items = await getRoadmapItemsByTrack(trackId);
      } else if (level === 'project') {
        // Fetch events for entire project
        items = await getTimelineEligibleItems(projectId);
      }
      
      // Filter to events only (type === 'event')
      const events = items.filter(item => item.type === 'event' && item.startDate);
      
      setPreviewEvents(events);
      setShowPreview(true);
    } catch (error) {
      console.error('[CalendarSyncPanel] Error loading preview:', error);
      alert('Failed to load preview. Please try again.');
    }
  }

  function handleToggleSync() {
    if (syncEnabled) {
      setShowUnsyncConfirm(true);
    } else {
      setShowEnableConfirm(true);
    }
  }

  function handleTargetChange(newTarget: TargetCalendarType) {
    if (newTarget === 'shared' || newTarget === 'both') {
      setTargetCalendar(newTarget);
      setShowSharedConfirm(true);
    } else {
      setTargetCalendar(newTarget);
      setTargetSpaceId(null);
    }
  }

  async function confirmEnable() {
    setSyncEnabled(true);
    setInheritFromParent(false); // Explicitly set
    setShowEnableConfirm(false);
    setTimeout(() => handleSave(), 100);
  }

  async function confirmShared() {
    setShowSharedConfirm(false);
    setTimeout(() => handleSave(), 100);
  }

  function confirmUnsync() {
    handleUnsync();
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Calculate inheritance state
  const isInheriting = inheritFromParent && (
    level === 'event' ? !eventSettings || (eventSettings && (
      (subtrackId && eventSettings.inherit_from_subtrack !== false) ||
      (trackId && eventSettings.inherit_from_track !== false) ||
      eventSettings.inherit_from_project !== false
    )) :
    level === 'subtrack' ? !subtrackSettings :
    level === 'track' ? !trackSettings :
    !projectSettings
  );
  const isExplicit = (
    level === 'event' ? eventSettings && (
      (subtrackId && eventSettings.inherit_from_subtrack === false) ||
      (trackId && eventSettings.inherit_from_track === false) ||
      eventSettings.inherit_from_project === false
    ) :
    level === 'subtrack' ? subtrackSettings && !subtrackSettings.inherit_from_track :
    level === 'track' ? trackSettings && !trackSettings.inherit_from_project :
    projectSettings && !projectSettings.inherit_from_global
  );
  const hasSharedWarning = targetCalendar === 'shared' || targetCalendar === 'both';

  // Determine inheritance source text
  let inheritanceText = '';
  if (level === 'event') {
    if (isInheriting) {
      // Event is inheriting - check source from effective sync
      const source = effectiveSync?.source;
      if (source === 'subtrack' && subtrackName) {
        inheritanceText = `Inheriting from Subtrack "${subtrackName}"`;
      } else if (source === 'track' && trackName) {
        inheritanceText = `Inheriting from Track "${trackName}"`;
      } else if (source === 'project') {
        inheritanceText = `Inheriting from Project "${projectName}"`;
      } else {
        inheritanceText = 'Inheriting from Global Settings';
      }
    } else {
      inheritanceText = `Explicitly set for this event`;
    }
  } else if (level === 'subtrack') {
    if (isInheriting) {
      // Subtrack is inheriting - check if track has explicit settings or inherits from project/global
      if (trackSettings && !trackSettings.inherit_from_project) {
        inheritanceText = `Inheriting from Track "${trackName || 'this track'}"`;
      } else if (projectSettings && !projectSettings.inherit_from_global) {
        inheritanceText = `Inheriting from Project "${projectName}"`;
      } else {
        inheritanceText = 'Inheriting from Global Settings';
      }
    } else {
      inheritanceText = `Explicitly set for subtrack "${subtrackName || 'this subtrack'}"`;
    }
  } else if (level === 'track') {
    if (isInheriting) {
      // Track is inheriting - check if project has explicit settings or inherits from global
      if (projectSettings && !projectSettings.inherit_from_global) {
        inheritanceText = `Inheriting from Project "${projectName}"`;
      } else {
        inheritanceText = 'Inheriting from Global Settings';
      }
    } else {
      inheritanceText = `Explicitly set for track "${trackName || 'this track'}"`;
    }
  } else {
    if (isInheriting) {
      inheritanceText = 'Inheriting from Global Settings';
    } else {
      inheritanceText = `Explicitly set for project "${projectName}"`;
    }
  }

  const entityName = 
    level === 'event' ? eventName || 'this event' :
    level === 'subtrack' ? subtrackName || 'this subtrack' :
    level === 'track' ? trackName || 'this track' :
    projectName;
  const entityLabel = 
    level === 'event' ? 'event' :
    level === 'subtrack' ? 'subtrack' :
    level === 'track' ? 'track' :
    'project';

  // For event level in drawer, don't show the header
  const showHeader = level !== 'event' || !showDefaultState;

  return (
    <div className={level === 'event' && showDefaultState ? 'space-y-4' : 'p-6 space-y-6'}>
      {/* Header (hidden for event level in default state) */}
      {showHeader && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar size={20} className="text-blue-600" />
            Calendar Sync
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {level === 'event' 
              ? 'Control how this event appears in your calendar'
              : entityLabel === 'subtrack' ? 'Control how this subtrack\'s events appear in your calendar'
              : entityLabel === 'track' ? 'Control how this track\'s events appear in your calendar'
              : 'Control how this project\'s events appear in your calendar'}
          </p>
        </div>
      )}

      {/* Event Level: Calm Default State (when inheriting) */}
      {level === 'event' && showDefaultState && isInheriting && !showOverrideControls && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info size={16} className="text-gray-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {inheritanceText}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                This event follows its parent settings. Changes to parent settings will affect this event.
              </p>
              {effectiveSync?.shouldSync && (
                <p className="text-xs text-gray-600 mt-2">
                  This event will appear in your <strong>{effectiveSync.targetCalendar === 'personal' ? 'Personal' : effectiveSync.targetCalendar === 'shared' ? 'Shared' : 'Personal and Shared'} Calendar</strong>.
                </p>
              )}
              <button
                onClick={() => setShowOverrideControls(true)}
                className="mt-3 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                Override for this event only →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sync Toggle (hidden for event level when in default state) */}
      {!(level === 'event' && showDefaultState && !showOverrideControls) && (
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-900">
              Sync this {entityLabel} to calendar
            </label>
            <p className="text-xs text-gray-500 mt-1">
              {level === 'event'
                ? `When enabled, this event will appear in your selected calendar`
                : `When enabled, events from ${entityName} will appear in your selected calendar`}
            </p>
          </div>
          <button
            onClick={handleToggleSync}
            disabled={saving}
            className={`
              relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              ${syncEnabled ? 'bg-blue-600' : 'bg-gray-200'}
              ${saving ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            role="switch"
            aria-checked={syncEnabled}
          >
            <span
              className={`
                pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                ${syncEnabled ? 'translate-x-5' : 'translate-x-0'}
              `}
            />
          </button>
        </div>

        {/* Inheritance Indicator */}
        {isInheriting && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">
                  {inheritanceText}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  {level === 'event'
                    ? `This event uses its parent's calendar sync settings. Override to set sync for this event only.`
                    : level === 'subtrack'
                    ? `This subtrack uses the track's calendar sync settings. Enable sync here to override for this subtrack only.`
                    : level === 'track' 
                    ? `This track uses the project's calendar sync settings. Enable sync here to override for this track only.`
                    : `This project uses your global calendar sync settings. Enable sync here to override for this project only.`}
                </p>
                {level === 'event' && effectiveSync && (
                  <p className="text-xs text-blue-700 mt-2">
                    {effectiveSync.shouldSync 
                      ? `This event will appear in your ${effectiveSync.targetCalendar === 'personal' ? 'Personal' : effectiveSync.targetCalendar === 'shared' ? 'Shared' : 'Personal and Shared'} Calendar.`
                      : 'This event will not appear in your calendar.'}
                  </p>
                )}
                {level === 'subtrack' && trackSettings && trackSettings.sync_enabled && (
                  <p className="text-xs text-blue-700 mt-2">
                    Track sync is currently: <strong>Enabled</strong> → {trackSettings.target_calendar_type === 'personal' ? 'Personal Calendar' : trackSettings.target_calendar_type === 'shared' ? 'Shared Calendar' : 'Both Calendars'}
                  </p>
                )}
                {level === 'track' && projectSettings && projectSettings.sync_enabled && (
                  <p className="text-xs text-blue-700 mt-2">
                    Project sync is currently: <strong>Enabled</strong> → {projectSettings.target_calendar_type === 'personal' ? 'Personal Calendar' : projectSettings.target_calendar_type === 'shared' ? 'Shared Calendar' : 'Both Calendars'}
                  </p>
                )}
                {level === 'project' && globalSettings && globalSettings.syncGuardrailsToPersonal && (
                  <p className="text-xs text-blue-700 mt-2">
                    Global sync is currently: <strong>Enabled</strong> → Personal Calendar
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {isExplicit && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900">
                  Explicitly set for this {entityLabel}
                </p>
                <p className="text-xs text-green-700 mt-1">
                  This {entityLabel} has its own calendar sync settings and does not inherit from {
                    level === 'subtrack' ? 'track' :
                    level === 'track' ? 'project' :
                    'global'
                  } settings.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Target Calendar Selection */}
      {!(level === 'event' && showDefaultState && !showOverrideControls) && syncEnabled && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-900 block mb-3">
              Target Calendar
            </label>
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="targetCalendar"
                  value="personal"
                  checked={targetCalendar === 'personal'}
                  onChange={async () => {
                    setTargetCalendar('personal');
                    setTargetSpaceId(null);
                    await handleSave();
                  }}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">Personal Calendar</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Events will appear only in your personal calendar
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="targetCalendar"
                  value="shared"
                  checked={targetCalendar === 'shared'}
                  onChange={() => handleTargetChange('shared')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    Shared Calendar
                    {hasSharedWarning && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-medium rounded">
                        <AlertTriangle size={12} />
                        Visible to household
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Events will appear in a shared household calendar
                  </div>
                  {targetCalendar === 'shared' && sharedSpaces.length > 0 && (
                    <select
                      value={targetSpaceId || ''}
                      onChange={async (e) => {
                        setTargetSpaceId(e.target.value || null);
                        await handleSave();
                      }}
                      className="mt-2 w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="">Select a space...</option>
                      {sharedSpaces.map(space => (
                        <option key={space.id} value={space.id}>{space.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="targetCalendar"
                  value="both"
                  checked={targetCalendar === 'both'}
                  onChange={() => handleTargetChange('both')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    Both Calendars
                    {hasSharedWarning && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-medium rounded">
                        <AlertTriangle size={12} />
                        Visible to household
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Events will appear in both your personal and shared calendars
                  </div>
                  {targetCalendar === 'both' && sharedSpaces.length > 0 && (
                    <select
                      value={targetSpaceId || ''}
                      onChange={async (e) => {
                        setTargetSpaceId(e.target.value || null);
                        await handleSave();
                      }}
                      className="mt-2 w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="">Select a space...</option>
                      {sharedSpaces.map(space => (
                        <option key={space.id} value={space.id}>{space.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Preview Button */}
      {!(level === 'event' && showDefaultState && !showOverrideControls) && syncEnabled && (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm font-medium text-gray-900">Preview Sync</p>
            <p className="text-xs text-gray-500 mt-1">
              See which events will sync to your calendar
            </p>
          </div>
          <button
            onClick={handlePreview}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
          >
            <Eye size={16} />
            Preview
          </button>
        </div>
      )}

      {/* Confirmation Modals */}
      {showEnableConfirm && (
        <EnableSyncConfirmModal
          entityName={entityName}
          entityLabel={entityLabel}
          onConfirm={confirmEnable}
          onCancel={() => setShowEnableConfirm(false)}
        />
      )}

      {showSharedConfirm && (
        <SharedCalendarConfirmModal
          targetCalendar={targetCalendar}
          spaceName={sharedSpaces.find(s => s.id === targetSpaceId)?.name || 'Shared Calendar'}
          onConfirm={confirmShared}
          onCancel={() => {
            setShowSharedConfirm(false);
            setTargetCalendar('personal');
            setTargetSpaceId(null);
          }}
        />
      )}

      {showUnsyncConfirm && (
        <UnsyncConfirmModal
          entityName={entityName}
          entityLabel={entityLabel}
          onConfirm={confirmUnsync}
          onCancel={() => setShowUnsyncConfirm(false)}
        />
      )}

      {showPreview && (
        <SyncPreviewModal
          entityName={entityName}
          entityLabel={entityLabel}
          events={previewEvents}
          targetCalendar={targetCalendar}
          spaceName={sharedSpaces.find(s => s.id === targetSpaceId)?.name}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}

// Confirmation Modals

interface EnableSyncConfirmModalProps {
  entityName: string;
  entityLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function EnableSyncConfirmModal({ entityName, entityLabel, onConfirm, onCancel }: EnableSyncConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Enable Calendar Sync?</h3>
        <p className="text-sm text-gray-600">
          This will sync events from <strong>{entityName}</strong> to your calendar.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-900">
            <strong>Note:</strong> Events will remain in Guardrails. Calendar sync is a one-way copy.
            You can disable sync at any time.
          </p>
        </div>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Enable Sync
          </button>
        </div>
      </div>
    </div>
  );
}

interface SharedCalendarConfirmModalProps {
  targetCalendar: TargetCalendarType;
  spaceName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function SharedCalendarConfirmModal({
  targetCalendar,
  spaceName,
  onConfirm,
  onCancel,
}: SharedCalendarConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">Sync to Shared Calendar?</h3>
            <p className="text-sm text-gray-600 mt-2">
              You're about to sync events to <strong>{spaceName}</strong>.
            </p>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs text-amber-900">
            <strong>This means:</strong>
          </p>
          <ul className="text-xs text-amber-900 mt-2 space-y-1 list-disc list-inside">
            <li>All events will be visible to household members</li>
            <li>Changes will appear in the shared calendar</li>
            <li>You can revoke this later</li>
          </ul>
        </div>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors"
          >
            Confirm Sync
          </button>
        </div>
      </div>
    </div>
  );
}

interface UnsyncConfirmModalProps {
  entityName: string;
  entityLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function UnsyncConfirmModal({ entityName, entityLabel, onConfirm, onCancel }: UnsyncConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Unsync from Calendar?</h3>
        <p className="text-sm text-gray-600">
          This will remove events from <strong>{entityName}</strong> from your calendar.
        </p>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <p className="text-xs text-gray-900">
            <strong>Note:</strong> Events will remain in Guardrails. You can re-enable sync later.
          </p>
        </div>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            Unsync Events
          </button>
        </div>
      </div>
    </div>
  );
}

interface SyncPreviewModalProps {
  entityName: string;
  entityLabel: string;
  events: RoadmapItem[];
  targetCalendar: TargetCalendarType;
  spaceName?: string;
  onClose: () => void;
}

function SyncPreviewModal({
  entityName,
  entityLabel,
  events,
  targetCalendar,
  spaceName,
  onClose,
}: SyncPreviewModalProps) {
  const calendarName =
    targetCalendar === 'personal'
      ? 'Personal Calendar'
      : targetCalendar === 'shared'
      ? spaceName || 'Shared Calendar'
      : `Personal Calendar and ${spaceName || 'Shared Calendar'}`;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Sync Preview</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <p className="text-sm text-gray-600">
              <strong>{events.length}</strong> events from <strong>{entityName}</strong> will sync to:
            </p>
            <p className="text-sm font-medium text-gray-900 mt-1">{calendarName}</p>
          </div>
          {events.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No events found in this {entityLabel}.</p>
              <p className="text-xs mt-1">Only events with dates will sync to your calendar.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {events.map(event => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{event.title}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {event.startDate && new Date(event.startDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
