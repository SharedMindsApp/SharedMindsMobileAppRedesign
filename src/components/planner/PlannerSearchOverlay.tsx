/**
 * Planner Search Overlay
 * 
 * Search overlay for planner-scoped items.
 * Mobile: Bottom sheet
 * Desktop: Centered modal
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Calendar, CheckSquare, FileText, Clock, Loader2 } from 'lucide-react';
import { searchPlannerItems, groupResultsByType, type PlannerSearchResult } from '../../lib/plannerSearch';
import { useAuth } from '../../contexts/AuthContext';
import { BottomSheet } from '../shared/BottomSheet';
import { useDebounce } from '../../hooks/useDebounce';

interface PlannerSearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PlannerSearchOverlay({ isOpen, onClose }: PlannerSearchOverlayProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlannerSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search query
  const debouncedQuery = useDebounce(query, 300);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Small delay to ensure modal is rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Reset query when closed
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  // Perform search when debounced query changes
  useEffect(() => {
    if (!user || !debouncedQuery.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    const performSearch = async () => {
      setLoading(true);
      try {
        const searchResults = await searchPlannerItems(user.id, debouncedQuery);
        setResults(searchResults);
      } catch (error) {
        console.error('[PlannerSearchOverlay] Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [user, debouncedQuery]);

  // Handle result click
  const handleResultClick = (result: PlannerSearchResult) => {
    navigate(result.route);
    onClose();
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Group results by type
  const groupedResults = useMemo(() => {
    return groupResultsByType(results);
  }, [results]);

  // Get icon for result type
  const getTypeIcon = (type: PlannerSearchResult['type']) => {
    switch (type) {
      case 'event':
        return Calendar;
      case 'task':
        return CheckSquare;
      case 'note':
        return FileText;
      case 'alignment':
        return Clock;
      default:
        return FileText;
    }
  };

  // Get type label
  const getTypeLabel = (type: PlannerSearchResult['type']): string => {
    switch (type) {
      case 'event':
        return 'Events';
      case 'task':
        return 'Tasks';
      case 'note':
        return 'Notes';
      case 'alignment':
        return 'Daily Alignment';
      default:
        return 'Items';
    }
  };

  // Mobile: Bottom Sheet
  if (isMobile) {
    return (
      <BottomSheet isOpen={isOpen} onClose={onClose} title="Search Planner">
        <div className="flex flex-col h-full">
          {/* Search Input */}
          <div className="px-4 pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search events, tasks, notes..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                autoFocus
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : query.trim() === '' ? (
              <div className="text-center py-8 text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Start typing to search...</p>
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No results found</p>
                <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedResults).map(([type, typeResults]) => {
                  if (typeResults.length === 0) return null;
                  
                  const Icon = getTypeIcon(type as PlannerSearchResult['type']);
                  const label = getTypeLabel(type as PlannerSearchResult['type']);

                  return (
                    <div key={type}>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-4 h-4 text-gray-500" />
                        <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
                        <span className="text-xs text-gray-400">({typeResults.length})</span>
                      </div>
                      <div className="space-y-1">
                        {typeResults.map((result) => (
                          <button
                            key={result.id}
                            onClick={() => handleResultClick(result)}
                            className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                          >
                            <div className="font-medium text-gray-900 text-sm">{result.title}</div>
                            {result.subtitle && (
                              <div className="text-xs text-gray-500 mt-1">{result.subtitle}</div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </BottomSheet>
    );
  }

  // Desktop: Centered Modal
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50"
          onClick={onClose}
        />
      )}

      {/* Modal */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        } transition-opacity duration-200`}
      >
        <div
          className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Search Planner</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X size={20} className="text-gray-600" />
            </button>
          </div>

          {/* Search Input */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search events, tasks, notes..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : query.trim() === '' ? (
              <div className="text-center py-8 text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Start typing to search...</p>
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No results found</p>
                <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedResults).map(([type, typeResults]) => {
                  if (typeResults.length === 0) return null;
                  
                  const Icon = getTypeIcon(type as PlannerSearchResult['type']);
                  const label = getTypeLabel(type as PlannerSearchResult['type']);

                  return (
                    <div key={type}>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-4 h-4 text-gray-500" />
                        <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
                        <span className="text-xs text-gray-400">({typeResults.length})</span>
                      </div>
                      <div className="space-y-1">
                        {typeResults.map((result) => (
                          <button
                            key={result.id}
                            onClick={() => handleResultClick(result)}
                            className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                          >
                            <div className="font-medium text-gray-900">{result.title}</div>
                            {result.subtitle && (
                              <div className="text-sm text-gray-500 mt-1">{result.subtitle}</div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
