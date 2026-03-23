/**
 * RoadmapSearchSheet
 * 
 * Phase 7: Search UI for Roadmap items.
 * 
 * Provides client-side search across:
 * - Tracks
 * - Subtracks
 * - Roadmap items (tasks, events, milestones, etc.)
 * 
 * Supports two scopes:
 * - Roadmap only (default) - searches projection data
 * - Entire project (phase 1 capability - may be limited to available data)
 * 
 * ⚠️ CRITICAL: This component is render-only. All actions happen via callbacks.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { BottomSheet } from '../../shared/BottomSheet';
import { Search, X, FolderTree, List, Circle, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import type { RoadmapProjection } from '../../../lib/guardrails/roadmapProjectionTypes';
import type { RoadmapItem } from '../../../lib/guardrails/coreTypes';

interface SearchEntity {
  kind: 'track' | 'subtrack' | 'item';
  id: string;
  title: string;
  description?: string;
  breadcrumb: string;
  parentTrackId?: string;
  subtrackId?: string;
  trackId?: string;
  status?: string;
}

interface RoadmapSearchSheetProps {
  isOpen: boolean;
  onClose: () => void;
  projection: RoadmapProjection;
  searchScope: 'roadmap' | 'project';
  onSearchScopeChange: (scope: 'roadmap' | 'project') => void;
  onSelectTrack: (trackId: string) => void;
  onSelectSubtrack: (subtrackId: string, parentTrackId: string) => void;
  onSelectItem: (itemId: string, trackId: string, subtrackId?: string) => void;
  onSetHighlight: (id: string) => void;
}

export function RoadmapSearchSheet({
  isOpen,
  onClose,
  projection,
  searchScope,
  onSearchScopeChange,
  onSelectTrack,
  onSelectSubtrack,
  onSelectItem,
  onSetHighlight,
}: RoadmapSearchSheetProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Auto-focus search input when sheet opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else if (!isOpen) {
      setQuery('');
      setDebouncedQuery('');
    }
  }, [isOpen]);

  // Build searchable entities from projection
  const searchableEntities = useMemo<SearchEntity[]>(() => {
    const entities: SearchEntity[] = [];

    projection.tracks.forEach(track => {
      // Add main track
      entities.push({
        kind: 'track',
        id: track.track.id,
        title: track.track.name,
        breadcrumb: track.track.name,
        parentTrackId: undefined,
      });

      // Add subtracks
      track.subtracks.forEach(subtrack => {
        entities.push({
          kind: 'subtrack',
          id: subtrack.track.id,
          title: subtrack.track.name,
          breadcrumb: `${track.track.name} > ${subtrack.track.name}`,
          parentTrackId: track.track.id,
        });

        // Add items in subtracks
        subtrack.items.forEach(item => {
          entities.push({
            kind: 'item',
            id: item.id,
            title: item.title,
            description: item.description || undefined,
            breadcrumb: `${track.track.name} > ${subtrack.track.name}`,
            trackId: subtrack.track.id,
            subtrackId: subtrack.track.id,
            status: item.status,
          });
        });
      });

      // Add items in main track
      track.items.forEach(item => {
        entities.push({
          kind: 'item',
          id: item.id,
          title: item.title,
          description: item.description || undefined,
          breadcrumb: track.track.name,
          trackId: track.track.id,
          status: item.status,
        });
      });
    });

    return entities;
  }, [projection]);

  // Filter results based on query
  const filteredResults = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return [];
    }

    const queryLower = debouncedQuery.toLowerCase().trim();

    return searchableEntities.filter(entity => {
      const titleMatch = entity.title.toLowerCase().includes(queryLower);
      const descriptionMatch = entity.description?.toLowerCase().includes(queryLower);
      const breadcrumbMatch = entity.breadcrumb.toLowerCase().includes(queryLower);

      return titleMatch || descriptionMatch || breadcrumbMatch;
    });
  }, [searchableEntities, debouncedQuery]);

  const handleResultClick = (entity: SearchEntity) => {
    // Set highlight (UI-only)
    onSetHighlight(entity.id);

    // Perform action based on entity type
    if (entity.kind === 'track') {
      onSelectTrack(entity.id);
    } else if (entity.kind === 'subtrack' && entity.parentTrackId) {
      onSelectSubtrack(entity.id, entity.parentTrackId);
    } else if (entity.kind === 'item' && entity.trackId) {
      onSelectItem(entity.id, entity.trackId, entity.subtrackId);
    }

    // Close sheet after selection
    onClose();
  };

  const getStatusIcon = (status?: string) => {
    if (!status) return null;
    
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'in_progress':
        return <Clock size={16} className="text-blue-600" />;
      case 'blocked':
        return <AlertCircle size={16} className="text-red-600" />;
      default:
        return <Circle size={16} className="text-gray-400" />;
    }
  };

  const getTypeBadge = (kind: SearchEntity['kind']) => {
    const badges = {
      track: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Track', icon: FolderTree },
      subtrack: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Subtrack', icon: FolderTree },
      item: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Item', icon: List },
    };

    const badge = badges[kind];
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        <Icon size={12} />
        {badge.label}
      </span>
    );
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Search Roadmap"
      maxHeight="90vh"
      closeOnBackdrop={true}
    >
      <div className="flex flex-col flex-1 min-h-0">
        {/* Search Input */}
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tracks, items, and more..."
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded transition-colors"
                aria-label="Clear search"
              >
                <X size={16} className="text-gray-400" />
              </button>
            )}
          </div>

          {/* Scope Toggle */}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => onSearchScopeChange('roadmap')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors min-h-[44px] ${
                searchScope === 'roadmap'
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Roadmap Only
            </button>
            <button
              onClick={() => onSearchScopeChange('project')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors min-h-[44px] ${
                searchScope === 'project'
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Entire Project
            </button>
          </div>

          {/* Phase 7: TODO note for project-wide search */}
          {searchScope === 'project' && (
            <p className="mt-2 text-xs text-gray-500 italic">
              Project-wide search will expand as project index becomes available.
            </p>
          )}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {!debouncedQuery.trim() ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <div className="text-center">
                <Search size={32} className="mx-auto mb-2 text-gray-400" />
                <p className="text-sm">Search your roadmap...</p>
              </div>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <div className="text-center">
                <Search size={32} className="mx-auto mb-2 text-gray-400" />
                <p className="text-sm font-medium">No matches found</p>
                <p className="text-xs mt-1">Try a different search term</p>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredResults.map((entity) => (
                <button
                  key={entity.id}
                  onClick={() => handleResultClick(entity)}
                  className="w-full px-3 py-3 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all min-h-[44px]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getTypeBadge(entity.kind)}
                        {entity.kind === 'item' && getStatusIcon(entity.status)}
                      </div>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {entity.title}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {entity.breadcrumb}
                      </p>
                      {entity.description && (
                        <p className="text-xs text-gray-400 truncate mt-1">
                          {entity.description}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
