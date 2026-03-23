import { useState, useEffect } from 'react';
import { Zap, Archive, ArrowLeft } from 'lucide-react';
import { getAllOffshootsForProject, removeOffshoot, archiveOffshoot } from '../../../lib/guardrails/offshoots';
import type { UnifiedOffshoot } from '../../../lib/guardrails/offshoots';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';

interface Props {
  masterProjectId: string;
  onRefresh: () => void;
  onItemClick?: (item: any) => void;
}

export function OffshootColumn({ masterProjectId, onRefresh, onItemClick }: Props) {
  const [offshoots, setOffshoots] = useState<UnifiedOffshoot[]>([]);
  const [loading, setLoading] = useState(true);

  const { setNodeRef } = useDroppable({
    id: 'offshoot_lane',
  });

  useEffect(() => {
    loadOffshoots();
  }, [masterProjectId]);

  async function loadOffshoots() {
    try {
      setLoading(true);
      const data = await getAllOffshootsForProject(masterProjectId);
      const roadmapOffshoots = data.filter(o => o.source_type === 'roadmap_item');
      setOffshoots(roadmapOffshoots);
    } catch (error) {
      console.error('Failed to load offshoots:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveOffshoot(id: string) {
    try {
      await removeOffshoot(id, 'roadmap_item');
      await loadOffshoots();
      onRefresh();
    } catch (error) {
      console.error('Failed to remove offshoot:', error);
    }
  }

  async function handleArchive(id: string) {
    if (!confirm('Archive this offshoot? This action cannot be undone.')) return;

    try {
      await archiveOffshoot(id, 'roadmap_item');
      await loadOffshoots();
      onRefresh();
    } catch (error) {
      console.error('Failed to archive offshoot:', error);
    }
  }

  return (
    <div className="flex-shrink-0 w-72">
      <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 h-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-orange-600" />
            <h3 className="font-semibold text-orange-900">Offshoot Ideas</h3>
          </div>
          <span className="px-2 py-0.5 bg-orange-200 text-orange-800 text-xs font-medium rounded-full">
            {offshoots.length}
          </span>
        </div>

        <p className="text-xs text-orange-700 mb-4">
          Ideas outside main tracks. Drag here or drag out to track columns.
        </p>

        <div
          ref={setNodeRef}
          className="space-y-2 min-h-[200px]"
        >
          <SortableContext
            items={offshoots.map(o => o.id)}
            strategy={verticalListSortingStrategy}
          >
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-lg p-3 border border-orange-300 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : offshoots.length === 0 ? (
              <div className="text-center py-8 text-orange-600 text-sm">
                No offshoots yet. Drag cards here to mark as offshoots.
              </div>
            ) : (
              offshoots.map(offshoot => (
                <div
                  key={offshoot.id}
                  onClick={() => onItemClick?.(offshoot)}
                  className="bg-white border-2 border-orange-300 rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow group"
                  style={{
                    borderLeftWidth: '4px',
                    borderLeftColor: offshoot.color || '#FF7F50',
                  }}
                >
                  <h4 className="font-medium text-sm text-gray-900 mb-2 line-clamp-2">
                    {offshoot.title}
                  </h4>

                  {offshoot.description && (
                    <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                      {offshoot.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-orange-100">
                    <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                      Offshoot
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveOffshoot(offshoot.id);
                        }}
                        className="p-1 hover:bg-orange-100 rounded"
                        title="Move to track"
                      >
                        <ArrowLeft size={14} className="text-orange-700" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArchive(offshoot.id);
                        }}
                        className="p-1 hover:bg-red-100 rounded"
                        title="Archive"
                      >
                        <Archive size={14} className="text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </SortableContext>
        </div>
      </div>
    </div>
  );
}
