import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import type { AlignmentBlockWithMicrotasks, WorkItem } from '../../lib/regulation/dailyAlignmentTypes';
import { AlignmentBlock } from './AlignmentBlock';
import { DURATION_OPTIONS } from '../../lib/regulation/dailyAlignmentTypes';
import { addBlock } from '../../lib/regulation/dailyAlignmentService';

interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
}

interface AlignmentCalendarSpineProps {
  alignmentId: string;
  blocks: AlignmentBlockWithMicrotasks[];
  calendarEvents: CalendarEvent[];
  onUpdate: () => void;
  onDrop?: (item: WorkItem, time: string) => void;
}

export function AlignmentCalendarSpine({
  alignmentId,
  blocks,
  calendarEvents,
  onUpdate,
  onDrop,
}: AlignmentCalendarSpineProps) {
  const [draggedItem, setDraggedItem] = useState<WorkItem | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [showDurationPicker, setShowDurationPicker] = useState(false);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const formatHour = (hour: number): string => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  };

  const getBlocksForHour = (hour: number): AlignmentBlockWithMicrotasks[] => {
    return blocks.filter(block => {
      const blockHour = parseInt(block.start_time.split(':')[0], 10);
      return blockHour === hour;
    });
  };

  const getEventsForHour = (hour: number): CalendarEvent[] => {
    return calendarEvents.filter(event => {
      const eventHour = parseInt(event.start_time.split(':')[0], 10);
      return eventHour === hour;
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, hour: number) => {
    e.preventDefault();

    const itemData = e.dataTransfer.getData('application/json');
    if (!itemData) return;

    try {
      const item: WorkItem = JSON.parse(itemData);
      const timeString = `${hour.toString().padStart(2, '0')}:00`;
      setDraggedItem(item);
      setSelectedTime(timeString);
      setShowDurationPicker(true);
    } catch (error) {
      console.error('Failed to parse dropped item:', error);
    }
  };

  const handleDurationSelect = async (durationMinutes: number) => {
    if (!draggedItem || !selectedTime) return;

    const success = await addBlock(
      alignmentId,
      draggedItem.type,
      draggedItem.id,
      draggedItem.title,
      selectedTime,
      durationMinutes
    );

    if (success) {
      setShowDurationPicker(false);
      setDraggedItem(null);
      setSelectedTime(null);
      onUpdate();
    }
  };

  const handleCancel = () => {
    setShowDurationPicker(false);
    setDraggedItem(null);
    setSelectedTime(null);
  };

  return (
    <div className="relative">
      {showDurationPicker && draggedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Roughly how long will this take?
            </h3>
            <p className="text-sm text-gray-600 mb-4">{draggedItem.title}</p>

            <div className="space-y-2">
              {DURATION_OPTIONS.map(option => (
                <button
                  key={option.minutes}
                  onClick={() => handleDurationSelect(option.minutes)}
                  className="w-full px-4 py-3 text-left border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"
                >
                  <span className="font-medium text-gray-900">{option.label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={handleCancel}
              className="mt-4 w-full px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-1">
        {hours.map(hour => (
          <div
            key={hour}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, hour)}
            className="flex gap-4 min-h-[60px] border-b border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <div className="w-20 flex-shrink-0 pt-2 text-sm font-medium text-gray-500">
              {formatHour(hour)}
            </div>

            <div className="flex-1 py-2 space-y-2">
              {getEventsForHour(hour).map(event => (
                <div
                  key={event.id}
                  className="p-2 bg-blue-50 border-l-4 border-blue-500 rounded"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">{event.title}</span>
                  </div>
                  <div className="text-xs text-blue-600 mt-0.5">
                    {event.start_time} - {event.end_time}
                  </div>
                </div>
              ))}

              {getBlocksForHour(hour).map(block => (
                <AlignmentBlock key={block.id} block={block} onUpdate={onUpdate} />
              ))}

              {getEventsForHour(hour).length === 0 && getBlocksForHour(hour).length === 0 && (
                <div className="h-12 flex items-center justify-center text-xs text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                  Drop work items here
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
