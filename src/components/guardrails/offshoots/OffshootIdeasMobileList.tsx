/**
 * OffshootIdeasMobileList - Mobile-first offshoot ideas capture and triage
 * 
 * Features:
 * - Single-column vertical list
 * - Quick capture FAB (always visible)
 * - Filter chips (Today | This Week | Older | All)
 * - Source tabs (All | Mind Mesh | Roadmap | Side Ideas)
 * - Drift awareness banner
 * - Default: Recent ideas only (last 7 days)
 */

import { useState, useEffect, useMemo } from 'react';
import { Plus, Zap, AlertTriangle } from 'lucide-react';
import type { UnifiedOffshoot, OffshootStats } from '../../../lib/guardrails/offshoots';
import { OffshootIdeaMobileCard } from './OffshootIdeaMobileCard';
import { QuickCaptureBottomSheet } from './QuickCaptureBottomSheet';
import { convertOffshootToRoadmap, archiveOffshoot } from '../../../lib/guardrails/offshoots';
import { convertNodeToSideProject, convertRoadmapItemToSideProject } from '../../../lib/guardrails/sideProjects';
import { showToast } from '../../Toast';

interface OffshootIdeasMobileListProps {
  offshoots: UnifiedOffshoot[];
  stats: OffshootStats | null;
  masterProjectId: string;
  onRefresh: () => void;
}

type TimeFilter = 'today' | 'week' | 'older' | 'all';
type SourceFilter = 'all' | 'node' | 'roadmap_item' | 'side_idea';

const TIME_FILTERS: Array<{ value: TimeFilter; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'older', label: 'Older' },
  { value: 'all', label: 'All' },
];

const SOURCE_FILTERS: Array<{ value: SourceFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'node', label: 'Mind Mesh' },
  { value: 'roadmap_item', label: 'Roadmap' },
  { value: 'side_idea', label: 'Side Ideas' },
];

function filterByTime(offshoot: UnifiedOffshoot, filter: TimeFilter): boolean {
  const created = new Date(offshoot.created_at);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  switch (filter) {
    case 'today':
      return created >= today;
    case 'week':
      return created >= weekAgo;
    case 'older':
      return created < weekAgo;
    case 'all':
    default:
      return true;
  }
}

export function OffshootIdeasMobileList({
  offshoots,
  stats,
  masterProjectId,
  onRefresh,
}: OffshootIdeasMobileListProps) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('week'); // Default: This Week
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [showCaptureSheet, setShowCaptureSheet] = useState(false);

  const filteredOffshoots = useMemo(() => {
    return offshoots.filter((offshoot) => {
      const matchesTime = filterByTime(offshoot, timeFilter);
      const matchesSource = sourceFilter === 'all' || offshoot.source_type === sourceFilter;
      return matchesTime && matchesSource;
    });
  }, [offshoots, timeFilter, sourceFilter]);

  const handlePromoteToRoadmap = async (id: string, type: string) => {
    if (!confirm('Promote this idea to a roadmap task?')) return;

    try {
      if (type === 'node') {
        await convertOffshootToRoadmap(id);
        showToast('success', 'Idea promoted to roadmap');
        onRefresh();
      } else {
        showToast('info', 'This idea is already in the roadmap');
      }
    } catch (error) {
      console.error('Failed to promote to roadmap:', error);
      showToast('error', 'Failed to promote idea');
    }
  };

  const handleConvertToSideProject = async (id: string, type: string) => {
    if (!confirm('Move this idea to a side project?')) return;

    try {
      if (type === 'node') {
        await convertNodeToSideProject(id, masterProjectId);
      } else if (type === 'roadmap_item') {
        await convertRoadmapItemToSideProject(id, masterProjectId);
      }
      showToast('success', 'Idea moved to side project');
      onRefresh();
    } catch (error) {
      console.error('Failed to convert to side project:', error);
      showToast('error', 'Failed to move idea');
    }
  };

  const handleArchive = async (id: string, type: string) => {
    if (!confirm('Archive this idea? This will remove it permanently.')) return;

    try {
      await archiveOffshoot(id, type as any);
      showToast('success', 'Idea archived');
      onRefresh();
    } catch (error) {
      console.error('Failed to archive idea:', error);
      showToast('error', 'Failed to archive idea');
    }
  };

  const hasHighDriftRisk = stats && stats.drift_risk !== 'low';

  return (
    <div className="h-full flex flex-col bg-gray-50 relative">
      {/* Drift Awareness Banner */}
      {hasHighDriftRisk && (
        <div className="sticky top-0 z-20 bg-amber-50 border-b border-amber-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-900 font-medium">
              You have unreviewed ideas piling up
            </p>
          </div>
        </div>
      )}

      {/* Filter Chips - Sticky */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
          <div className="flex gap-2 min-w-max">
            {TIME_FILTERS.map((filter) => {
              const count = offshoots.filter((o) => filterByTime(o, filter.value)).length;
              const isActive = timeFilter === filter.value;

              return (
                <button
                  key={filter.value}
                  onClick={() => setTimeFilter(filter.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap min-h-[44px] ${
                    isActive
                      ? 'bg-amber-100 text-amber-900 border-2 border-amber-300'
                      : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                  }`}
                >
                  {filter.label}
                  {count > 0 && (
                    <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
                      isActive ? 'bg-amber-200 text-amber-900' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Source Tabs - Sticky */}
      <div className="sticky top-[76px] z-10 bg-white border-b border-gray-200">
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex min-w-max">
            {SOURCE_FILTERS.map((filter) => {
              const isActive = sourceFilter === filter.value;

              return (
                <button
                  key={filter.value}
                  onClick={() => setSourceFilter(filter.value)}
                  className={`relative px-6 py-4 text-sm font-medium transition-colors min-h-[56px] flex items-center gap-2 border-b-2 ${
                    isActive
                      ? 'text-amber-600 border-amber-600 bg-amber-50'
                      : 'text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Idea List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
        {filteredOffshoots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] px-4">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap size={32} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {timeFilter === 'today' ? 'Nothing captured today' : 'No ideas here'}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {timeFilter === 'today'
                  ? 'Ideas you jot down during work appear here.'
                  : 'Start capturing ideas to keep track of spontaneous inspiration.'}
              </p>
              <button
                onClick={() => setShowCaptureSheet(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
              >
                <Plus size={16} />
                <span>Capture Idea</span>
              </button>
            </div>
          </div>
        ) : (
          filteredOffshoots.map((offshoot) => (
            <OffshootIdeaMobileCard
              key={offshoot.id}
              offshoot={offshoot}
              onPromoteToRoadmap={handlePromoteToRoadmap}
              onConvertToSideProject={handleConvertToSideProject}
              onArchive={handleArchive}
            />
          ))
        )}
      </div>

      {/* Quick Capture FAB */}
      <button
        onClick={() => setShowCaptureSheet(true)}
        className="fixed bottom-20 right-4 z-40 w-14 h-14 bg-amber-600 text-white rounded-full shadow-lg hover:bg-amber-700 active:scale-95 transition-all flex items-center justify-center"
        aria-label="Capture idea"
      >
        <Plus size={24} />
      </button>

      {/* Quick Capture Bottom Sheet */}
      <QuickCaptureBottomSheet
        masterProjectId={masterProjectId}
        isOpen={showCaptureSheet}
        onClose={() => setShowCaptureSheet(false)}
        onSuccess={onRefresh}
      />
    </div>
  );
}

