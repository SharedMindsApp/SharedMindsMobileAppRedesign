import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, ZoomIn, ZoomOut, Plus, Filter } from 'lucide-react';
import type { ZoomLevel } from '../../../lib/guardrails/advancedGanttUtils';

interface TimelineControlsProps {
  zoomLevel: ZoomLevel;
  onZoomChange: (level: ZoomLevel) => void;
  onScrollToToday: () => void;
  onJumpToDate: (date: Date) => void;
  onScrollLeft: () => void;
  onScrollRight: () => void;
  onAddItem: () => void;
  onToggleFilters: () => void;
  hasFilters: boolean;
}

export function TimelineControls({
  zoomLevel,
  onZoomChange,
  onScrollToToday,
  onJumpToDate,
  onScrollLeft,
  onScrollRight,
  onAddItem,
  onToggleFilters,
  hasFilters,
}: TimelineControlsProps) {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const datePickerRef = useRef<HTMLDivElement>(null);

  const zoomLevels: ZoomLevel[] = ['day', 'week', 'month', 'quarter'];
  const currentIndex = zoomLevels.indexOf(zoomLevel);

  const handleZoomIn = () => {
    if (currentIndex > 0) {
      onZoomChange(zoomLevels[currentIndex - 1]);
    }
  };

  const handleZoomOut = () => {
    if (currentIndex < zoomLevels.length - 1) {
      onZoomChange(zoomLevels[currentIndex + 1]);
    }
  };

  const handleDateSelect = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDate) {
      const date = new Date(selectedDate);
      onJumpToDate(date);
      setIsDatePickerOpen(false);
      setSelectedDate('');
    }
  };

  // Click away handler for date picker
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setIsDatePickerOpen(false);
        setSelectedDate('');
      }
    };

    if (isDatePickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDatePickerOpen]);

  return (
    <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center gap-2">
        <button
          onClick={onScrollLeft}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Scroll left"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="relative" ref={datePickerRef}>
          <button
            onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
            className="px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1.5"
            title="Jump to date"
          >
            <Calendar size={16} />
            Today
          </button>

          {isDatePickerOpen && (
            <div className="absolute left-0 top-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50 min-w-[280px]">
              <form onSubmit={handleDateSelect} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Jump to Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onScrollToToday();
                      setIsDatePickerOpen(false);
                    }}
                    className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Today
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedDate}
                    className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    Go
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        <button
          onClick={onScrollRight}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Scroll right"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-lg">
          <button
            onClick={handleZoomIn}
            disabled={currentIndex === 0}
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-white rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Zoom in"
          >
            <ZoomIn size={16} />
          </button>

          <div className="px-3 py-1 min-w-[80px] text-center">
            <span className="text-sm font-medium text-gray-700 capitalize">
              {zoomLevel}
            </span>
          </div>

          <button
            onClick={handleZoomOut}
            disabled={currentIndex === zoomLevels.length - 1}
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-white rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Zoom out"
          >
            <ZoomOut size={16} />
          </button>
        </div>

        <button
          onClick={onToggleFilters}
          className={`p-2 rounded-lg transition-colors ${
            hasFilters
              ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
          title="Toggle filters"
        >
          <Filter size={20} />
        </button>

        <button
          onClick={onAddItem}
          className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 font-medium text-sm"
        >
          <Plus size={18} />
          Add Item
        </button>
      </div>
    </div>
  );
}
