import { useState, useEffect } from 'react';
import { Zap, Archive, ArrowRight, MoreVertical } from 'lucide-react';
import { getAllOffshootsForProject, archiveOffshoot, removeOffshoot, convertOffshootToRoadmap } from '../../../lib/guardrails/offshoots';
import type { UnifiedOffshoot } from '../../../lib/guardrails/offshoots';

interface Props {
  masterProjectId: string;
  onRefresh: () => void;
}

export function OffshootLane({ masterProjectId, onRefresh }: Props) {
  const [offshoots, setOffshoots] = useState<UnifiedOffshoot[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    loadOffshoots();
  }, [masterProjectId]);

  async function loadOffshoots() {
    try {
      setLoading(true);
      const data = await getAllOffshootsForProject(masterProjectId);
      setOffshoots(data.filter(o => o.source_type === 'roadmap_item'));
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

  if (loading) {
    return (
      <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 mb-6">
        <div className="animate-pulse flex items-center gap-2">
          <div className="h-5 w-5 bg-orange-200 rounded"></div>
          <div className="h-4 bg-orange-200 rounded w-32"></div>
        </div>
      </div>
    );
  }

  if (offshoots.length === 0) {
    return null;
  }

  return (
    <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-orange-900 flex items-center gap-2">
          <Zap size={18} className="text-orange-600" />
          Offshoot Lane ({offshoots.length})
        </h3>
        <p className="text-xs text-orange-700">Ideas outside main tracks</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {offshoots.map(offshoot => (
          <div
            key={offshoot.id}
            className="bg-white border border-orange-300 rounded-lg p-3 hover:shadow-md transition-shadow relative group"
            style={{
              borderLeftWidth: '4px',
              borderLeftColor: offshoot.color || '#FF7F50',
            }}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className="font-medium text-sm text-gray-900 line-clamp-2">{offshoot.title}</h4>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId(openMenuId === offshoot.id ? null : offshoot.id);
                }}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                <MoreVertical size={16} />
              </button>
            </div>

            {offshoot.description && (
              <p className="text-xs text-gray-600 line-clamp-2 mb-2">{offshoot.description}</p>
            )}

            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                Offshoot
              </span>
            </div>

            {openMenuId === offshoot.id && (
              <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[180px]">
                <button
                  onClick={() => {
                    handleRemoveOffshoot(offshoot.id);
                    setOpenMenuId(null);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <ArrowRight size={14} />
                  Move to Track
                </button>
                <button
                  onClick={() => {
                    handleArchive(offshoot.id);
                    setOpenMenuId(null);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-red-600"
                >
                  <Archive size={14} />
                  Archive
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
