/**
 * Event Calendar Sync Controls
 * 
 * Phase 5: Event-level calendar sync controls embedded in roadmap item drawer.
 * 
 * This is a thin wrapper around CalendarSyncPanel with a calm default state.
 * When inheriting, shows informative state instead of loud toggle.
 * 
 * TODO (Future Phases):
 * - Phase 6: Wire resolver into sync execution logic
 * - Phase 7: Shared calendar projections implementation
 */

import { CalendarSyncPanel } from './CalendarSyncPanel';
import type { SyncableEntityType } from '../../../lib/guardrails/calendarSync/types';

interface EventCalendarSyncControlsProps {
  eventId: string;
  eventName: string;
  entityType: SyncableEntityType;
  projectId: string;
  projectName: string;
  trackId?: string | null;
  trackName?: string;
  subtrackId?: string | null;
  subtrackName?: string;
}

export function EventCalendarSyncControls({
  eventId,
  eventName,
  entityType,
  projectId,
  projectName,
  trackId,
  trackName,
  subtrackId,
  subtrackName,
}: EventCalendarSyncControlsProps) {
  return (
    <div className="border-t border-gray-200 pt-4">
      <h4 className="text-sm font-semibold text-gray-900 mb-3">Calendar</h4>
      <CalendarSyncPanel
        level="event"
        projectId={projectId}
        projectName={projectName}
        trackId={trackId || undefined}
        trackName={trackName}
        subtrackId={subtrackId || undefined}
        subtrackName={subtrackName}
        eventId={eventId}
        entityType={entityType}
        eventName={eventName}
        showDefaultState={true}
      />
    </div>
  );
}
