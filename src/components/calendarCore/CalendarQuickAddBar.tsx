/**
 * CalendarQuickAddBar - Inline Event Creation Bar
 * 
 * Bottom inline event creation bar for Month view.
 * Allows quick event creation without leaving the calendar.
 */

import { useState, useEffect, useRef } from 'react';
import { Plus, Check } from 'lucide-react';
import { formatDate } from '../../../lib/calendarUtils';

interface CalendarQuickAddBarProps {
  date: Date;
  onSubmit: (title: string, date: Date) => void;
}

export function CalendarQuickAddBar({
  date,
  onSubmit,
}: CalendarQuickAddBarProps) {
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when date changes
  useEffect(() => {
    if (inputRef.current) {
      // Small delay to ensure smooth transition
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [date]);

  // Clear title when date changes
  useEffect(() => {
    setTitle('');
  }, [date]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit(title.trim(), date);
    setTitle('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setTitle('');
      inputRef.current?.blur();
    }
  };

  // Format date for display: "Fri · Jan 9"
  const formatDisplayDate = (date: Date): string => {
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    return `${weekday} · ${month} ${day}`;
  };

  return (
    <div className="sticky bottom-0 bg-white border-t border-gray-200 z-30 safe-bottom">
      <div className="px-4 py-3">
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          {/* Plus Icon */}
          <div className="flex-shrink-0">
            <Plus size={20} className="text-gray-500" />
          </div>

          {/* Date Label */}
          <div className="flex-shrink-0 text-sm font-medium text-gray-700 whitespace-nowrap">
            Add event for {formatDisplayDate(date)}
          </div>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Event title…"
            className="flex-1 min-w-0 px-3 py-2 text-base bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label={`Add event for ${formatDisplayDate(date)}`}
          />

          {/* Save Button */}
          <button
            type="submit"
            disabled={!title.trim()}
            className="flex-shrink-0 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] flex items-center justify-center gap-2"
            aria-label="Save event"
          >
            <Check size={18} />
            <span className="hidden sm:inline">Save</span>
          </button>
        </form>
      </div>
    </div>
  );
}
