/**
 * Track Calendar Sync Modal
 * 
 * Phase 3: Track-level calendar sync settings modal.
 * 
 * Opens from track context menu in Roadmap View.
 * Uses BottomSheet on mobile, modal on desktop.
 * 
 * TODO (Future Phases):
 * - Subtrack-level modal (Phase 4) - Not implemented yet
 * - Event-level sync UI (Phase 5) - Not implemented yet
 */

import { BottomSheet } from '../../shared/BottomSheet';
import { CalendarSyncPanel } from './CalendarSyncPanel';

interface TrackCalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  trackId: string;
  trackName: string;
}

export function TrackCalendarSyncModal({
  isOpen,
  onClose,
  projectId,
  projectName,
  trackId,
  trackName,
}: TrackCalendarSyncModalProps) {
  if (!isOpen) return null;

  // Mobile: Use BottomSheet
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  if (isMobile) {
    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title={`Calendar Sync: ${trackName}`}
        maxHeight="90vh"
      >
        <CalendarSyncPanel
          level="track"
          projectId={projectId}
          projectName={projectName}
          trackId={trackId}
          trackName={trackName}
        />
      </BottomSheet>
    );
  }

  // Desktop: Centered modal
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Calendar Sync Settings</h2>
              <p className="text-sm text-gray-600 mt-1">{trackName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <CalendarSyncPanel
              level="track"
              projectId={projectId}
              projectName={projectName}
              trackId={trackId}
              trackName={trackName}
            />
          </div>
        </div>
      </div>
    </>
  );
}
