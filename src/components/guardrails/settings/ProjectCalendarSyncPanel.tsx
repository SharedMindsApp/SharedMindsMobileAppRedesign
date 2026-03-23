/**
 * Project Calendar Sync Panel
 * 
 * Phase 2: Project-level calendar sync settings UI.
 * Phase 8: Added Personal Calendar Sharing section.
 * 
 * This component includes:
 * - Calendar Sync settings (Phase 2)
 * - Personal Calendar Access sharing (Phase 8)
 */

import { CalendarSyncPanel } from './CalendarSyncPanel';
import { ProjectPersonalCalendarSharingPanel } from './ProjectPersonalCalendarSharingPanel';

interface ProjectCalendarSyncPanelProps {
  projectId: string;
  projectName: string;
}

export function ProjectCalendarSyncPanel({
  projectId,
  projectName,
}: ProjectCalendarSyncPanelProps) {
  return (
    <div className="space-y-8">
      {/* Calendar Sync Settings */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sync to Calendar</h3>
        <CalendarSyncPanel
          level="project"
          projectId={projectId}
          projectName={projectName}
        />
      </div>

      {/* Personal Calendar Sharing (Phase 8) */}
      <div className="border-t border-gray-200 pt-8">
        <ProjectPersonalCalendarSharingPanel
          projectId={projectId}
          projectName={projectName}
        />
      </div>
    </div>
  );
}
