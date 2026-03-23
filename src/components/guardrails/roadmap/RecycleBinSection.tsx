/**
 * RecycleBinSection Component
 * 
 * Displays soft-deleted tracks and subtracks for a project.
 * Allows restoration of deleted items.
 * 
 * ARCHITECTURAL RULES:
 * - Uses service layer only (no direct Supabase queries)
 * - All mutations go through trackSoftDeleteService
 * - Roadmap projection will automatically refresh after restore
 */

import { useState, useEffect, useCallback } from 'react';
import { Trash2, RotateCcw, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { getDeletedTracks, restoreTrack, type DeletedTrack } from '../../../lib/guardrails/trackSoftDeleteService';

interface RecycleBinSectionProps {
  masterProjectId: string;
  onRestore?: () => void; // Callback when item is restored
}

export function RecycleBinSection({ masterProjectId, onRestore }: RecycleBinSectionProps) {
  const [deletedTracks, setDeletedTracks] = useState<DeletedTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Load deleted tracks
  const loadDeletedTracks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const tracks = await getDeletedTracks(masterProjectId);
      setDeletedTracks(tracks);
    } catch (err) {
      console.error('[RecycleBinSection] Error loading deleted tracks:', err);
      setError(err instanceof Error ? err.message : 'Failed to load deleted tracks');
    } finally {
      setLoading(false);
    }
  }, [masterProjectId]);

  useEffect(() => {
    loadDeletedTracks();
  }, [loadDeletedTracks]);

  // Handle restore
  const handleRestore = useCallback(async (trackId: string) => {
    try {
      setRestoringId(trackId);
      setError(null);

      await restoreTrack(trackId);
      
      // Remove from list
      setDeletedTracks(prev => prev.filter(t => t.id !== trackId));
      
      // Notify parent to refresh projection
      if (onRestore) {
        onRestore();
      }
    } catch (err) {
      console.error('[RecycleBinSection] Error restoring track:', err);
      setError(err instanceof Error ? err.message : 'Failed to restore track');
    } finally {
      setRestoringId(null);
    }
  }, [onRestore]);

  // Format days remaining text
  const formatDaysRemaining = (days: number): string => {
    if (days === 0) {
      return 'Permanently deleted today';
    } else if (days === 1) {
      return '1 day remaining';
    } else {
      return `${days} days remaining`;
    }
  };

  // Format deleted date
  const formatDeletedDate = (deletedAt: string): string => {
    const date = new Date(deletedAt);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-600">Loading deleted tracks...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Error loading recycle bin</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (deletedTracks.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 text-gray-400 mb-3">
          <Trash2 size={24} />
        </div>
        <p className="text-sm text-gray-600">No deleted tracks</p>
        <p className="text-xs text-gray-500 mt-1">Deleted tracks will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Error banner (if restore fails) */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Deleted tracks list */}
      <div className="space-y-2">
        {deletedTracks.map((track) => {
          const isRestoring = restoringId === track.id;
          const isExpiringSoon = track.daysRemaining <= 1 && track.daysRemaining > 0;
          
          return (
            <div
              key={track.id}
              className={`border rounded-lg p-4 ${
                isExpiringSoon
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {track.name}
                    </span>
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700 flex-shrink-0">
                      {track.parentTrackId ? 'Subtrack' : 'Track'}
                    </span>
                  </div>
                  
                  {track.description && (
                    <p className="text-sm text-gray-600 truncate mb-2">
                      {track.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      <span>Deleted {formatDeletedDate(track.deletedAt)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span
                        className={
                          isExpiringSoon
                            ? 'text-amber-700 font-medium'
                            : track.daysRemaining === 0
                            ? 'text-red-700 font-medium'
                            : 'text-gray-600'
                        }
                      >
                        {formatDaysRemaining(track.daysRemaining)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleRestore(track.id)}
                  disabled={isRestoring || track.daysRemaining === 0}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex-shrink-0 ${
                    isRestoring || track.daysRemaining === 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  }`}
                  title={track.daysRemaining === 0 ? 'Already permanently deleted' : 'Restore track'}
                >
                  {isRestoring ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Restoring...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw size={14} />
                      <span>Restore</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info message */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-800">
          <strong>Note:</strong> Deleted tracks are permanently removed after 7 days. Restore them before then to recover all associated data.
        </p>
      </div>
    </div>
  );
}
