/**
 * CalendarSearchOverlay - Calendar Event Search
 * 
 * Overlay component for searching calendar events.
 * Mobile: Bottom sheet
 * Desktop: Full-screen overlay
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { X, Search, ArrowLeft } from 'lucide-react';
import type { CalendarEventWithMembers } from '../../lib/calendarTypes';
import { formatTime } from '../../lib/calendarUtils';
import { BottomSheet } from '../shared/BottomSheet';

interface CalendarSearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  events: CalendarEventWithMembers[];
  onEventSelect: (event: CalendarEventWithMembers) => void;
}

export function CalendarSearchOverlay({
  isOpen,
  onClose,
  events,
  onEventSelect,
}: CalendarSearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Auto-focus input when overlay opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Small delay to ensure smooth animation
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setQuery('');
      setDebouncedQuery('');
    }
  }, [isOpen]);

  // Filter events based on search query
  const filteredEvents = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return [];
    }

    const lowerQuery = debouncedQuery.toLowerCase();
    return events.filter(event => {
      const titleMatch = event.title.toLowerCase().includes(lowerQuery);
      const descriptionMatch = event.description?.toLowerCase().includes(lowerQuery) || false;
      const locationMatch = event.location?.toLowerCase().includes(lowerQuery) || false;
      return titleMatch || descriptionMatch || locationMatch;
    });
  }, [events, debouncedQuery]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Handle Enter key - open first result
  useEffect(() => {
    if (!isOpen) return;

    const handleEnter = (e: KeyboardEvent) => {
      // Only handle Enter if input is focused and there are results
      if (e.key === 'Enter' && document.activeElement === inputRef.current && filteredEvents.length > 0) {
        e.preventDefault();
        onEventSelect(filteredEvents[0]);
      }
    };

    document.addEventListener('keydown', handleEnter);
    return () => {
      document.removeEventListener('keydown', handleEnter);
    };
  }, [isOpen, filteredEvents, onEventSelect]);

  // Format date for display
  const formatEventDate = (date: Date): string => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    }
  };

  // Format time range
  const formatTimeRange = (event: CalendarEventWithMembers): string => {
    if (event.all_day) {
      return 'All day';
    }
    const start = new Date(event.start_at);
    const end = new Date(event.end_at);
    return `${formatTime(start)}–${formatTime(end)}`;
  };

  // Get event color indicator
  const getEventColorClass = (color: string): string => {
    const colorMap: Record<string, string> = {
      blue: 'bg-blue-500',
      red: 'bg-red-500',
      green: 'bg-green-500',
      yellow: 'bg-yellow-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500',
      pink: 'bg-pink-500',
      gray: 'bg-gray-500',
    };
    return colorMap[color] || 'bg-blue-500';
  };

  const handleEventClick = (event: CalendarEventWithMembers) => {
    onEventSelect(event);
    onClose();
  };

  // Render search input header
  const renderSearchHeader = () => (
    <div className="flex items-center gap-3 w-full">
      {/* Back Button - Mobile only */}
      {isMobile && (
        <button
          onClick={onClose}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors flex-shrink-0 -ml-2"
          aria-label="Back to calendar"
        >
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
      )}
      <Search size={20} className="text-gray-400 flex-shrink-0" />
      <input
        ref={inputRef}
        type="text"
        placeholder="Search events…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          // Handle Enter key on input
          if (e.key === 'Enter' && filteredEvents.length > 0) {
            e.preventDefault();
            onEventSelect(filteredEvents[0]);
          }
        }}
        className="flex-1 text-base bg-transparent border-none outline-none text-gray-900 placeholder-gray-400"
        autoFocus={!isMobile} // Auto-focus on desktop, mobile will focus after animation
      />
      {query && (
        <button
          onClick={() => setQuery('')}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors flex-shrink-0"
          aria-label="Clear search"
        >
          <X size={18} className="text-gray-500" />
        </button>
      )}
    </div>
  );

  // Render search results
  const renderResults = () => {
    if (!debouncedQuery.trim()) {
      return (
        <div className="flex items-center justify-center h-full p-8">
          <p className="text-sm text-gray-500 text-center">
            Search your calendar by event name or description
          </p>
        </div>
      );
    }

    if (filteredEvents.length === 0) {
      return (
        <div className="flex items-center justify-center h-full p-8">
          <p className="text-sm text-gray-500 text-center">
            No matching events found
          </p>
        </div>
      );
    }

    return (
      <div className="divide-y divide-gray-100">
        {filteredEvents.map((event) => {
          const eventDate = new Date(event.start_at);
          return (
            <button
              key={event.id}
              onClick={() => handleEventClick(event)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-start gap-3 min-h-[44px]"
            >
              {/* Color Indicator */}
              <div
                className={`w-3 h-3 rounded-full flex-shrink-0 mt-1.5 ${getEventColorClass(event.color)}`}
                aria-hidden="true"
              />

              {/* Event Details */}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 mb-0.5 truncate">
                  {event.title}
                </div>
                <div className="text-sm text-gray-600 flex items-center gap-2 flex-wrap">
                  <span>{formatEventDate(eventDate)}</span>
                  {!event.all_day && (
                    <>
                      <span className="text-gray-300">·</span>
                      <span>{formatTimeRange(event)}</span>
                    </>
                  )}
                </div>
                {event.location && (
                  <div className="text-xs text-gray-500 mt-1 truncate">
                    📍 {event.location}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  if (!isOpen) return null;

  // Mobile: Bottom Sheet
  if (isMobile) {
    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        maxHeight="85vh"
        header={renderSearchHeader()}
        showCloseButton={false}
      >
        <div className="px-4 py-3">{renderResults()}</div>
      </BottomSheet>
    );
  }

  // Desktop: Full-screen overlay
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Search Overlay */}
      <div
        className="fixed inset-0 bg-white z-50 flex flex-col shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-label="Search calendar events"
      >
        {/* Search Input - Sticky */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 safe-top z-10">
          <div className="flex items-center gap-3">
            <Search size={20} className="text-gray-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search events…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                // Handle Enter key on input
                if (e.key === 'Enter' && filteredEvents.length > 0) {
                  e.preventDefault();
                  onEventSelect(filteredEvents[0]);
                }
              }}
              className="flex-1 text-base bg-transparent border-none outline-none text-gray-900 placeholder-gray-400"
              autoFocus
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors flex-shrink-0"
                aria-label="Clear search"
              >
                <X size={18} className="text-gray-500" />
              </button>
            )}
          </div>
        </div>

        {/* Search Results - Scrollable */}
        <div className="flex-1 overflow-y-auto overscroll-contain safe-bottom">
          {renderResults()}
        </div>
      </div>
    </>
  );
}
