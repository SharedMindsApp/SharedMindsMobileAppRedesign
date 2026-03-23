import { useState, useEffect } from 'react';
import { Calendar, Coffee, Utensils, Clock, Settings } from 'lucide-react';
import type { AlignmentBlockWithMicrotasks, WorkItem, DailyAlignmentSettings } from '../../lib/regulation/dailyAlignmentTypes';
import { AlignmentBlock } from './AlignmentBlock';
import { DURATION_OPTIONS } from '../../lib/regulation/dailyAlignmentTypes';
import { addBlock, getAlignmentSettings } from '../../lib/regulation/dailyAlignmentService';

interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  date: string;
}

interface AlignmentCalendarSpineEnhancedProps {
  alignmentId: string;
  blocks: AlignmentBlockWithMicrotasks[];
  calendarEvents: CalendarEvent[];
  userId: string;
  onUpdate: () => void;
  onOpenSettings: () => void;
}

export function AlignmentCalendarSpineEnhanced({
  alignmentId,
  blocks,
  calendarEvents,
  userId,
  onUpdate,
  onOpenSettings,
}: AlignmentCalendarSpineEnhancedProps) {
  const [draggedItem, setDraggedItem] = useState<WorkItem | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [settings, setSettings] = useState<DailyAlignmentSettings | null>(null);

  useEffect(() => {
    loadSettings();
  }, [userId]);

  const loadSettings = async () => {
    const data = await getAlignmentSettings(userId);
    setSettings(data);
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const formatHour = (hour: number): string => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  };

  const parseTime = (timeStr: string): { hour: number; minute: number } => {
    const [hour, minute] = timeStr.split(':').map(Number);
    return { hour, minute };
  };

  const isWorkingHour = (hour: number): boolean => {
    if (!settings) return true;

    const start = parseTime(settings.work_start_time);
    const end = parseTime(settings.work_end_time);

    return hour >= start.hour && hour < end.hour;
  };

  const isLunchBreak = (hour: number): boolean => {
    if (!settings || !settings.lunch_break_start) return false;

    const lunch = parseTime(settings.lunch_break_start);
    const durationHours = Math.ceil(settings.lunch_break_duration / 60);

    return hour >= lunch.hour && hour < lunch.hour + durationHours;
  };

  const isMorningBreak = (hour: number): boolean => {
    if (!settings || !settings.enable_morning_break || !settings.morning_break_start) return false;

    const breakTime = parseTime(settings.morning_break_start);
    return hour === breakTime.hour;
  };

  const isAfternoonBreak = (hour: number): boolean => {
    if (!settings || !settings.enable_afternoon_break || !settings.afternoon_break_start) return false;

    const breakTime = parseTime(settings.afternoon_break_start);
    return hour === breakTime.hour;
  };

  const isBlockedTime = (hour: number): { blocked: boolean; label?: string } => {
    if (!settings || !settings.blocked_times) return { blocked: false };

    for (const blockedTime of settings.blocked_times) {
      const start = parseTime(blockedTime.start_time);
      const end = parseTime(blockedTime.end_time);

      if (hour >= start.hour && hour < end.hour) {
        return { blocked: true, label: blockedTime.label };
      }
    }

    return { blocked: false };
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
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full border-2 border-blue-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              How long will this take?
            </h3>
            <p className="text-sm text-gray-600 mb-1">{draggedItem.title}</p>
            <p className="text-xs text-gray-500 mb-4">
              {draggedItem.projectName && <span>{draggedItem.projectName}</span>}
              {draggedItem.projectName && draggedItem.trackName && <span> › </span>}
              {draggedItem.trackName && <span>{draggedItem.trackName}</span>}
            </p>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {DURATION_OPTIONS.map(option => (
                <button
                  key={option.minutes}
                  onClick={() => handleDurationSelect(option.minutes)}
                  className="px-4 py-3 text-left border-2 border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-all font-medium text-gray-900"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span>{option.label}</span>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={handleCancel}
              className="w-full px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Today's Schedule</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
          Settings
        </button>
      </div>

      <div className="space-y-0 border border-gray-200 rounded-lg overflow-hidden bg-white">
        {hours.map(hour => {
          const blockedInfo = isBlockedTime(hour);
          const isWorking = isWorkingHour(hour);
          const isLunch = isLunchBreak(hour);
          const isMorning = isMorningBreak(hour);
          const isAfternoon = isAfternoonBreak(hour);
          const hourBlocks = getBlocksForHour(hour);
          const hourEvents = getEventsForHour(hour);

          let bgClass = 'bg-white';
          let borderClass = 'border-gray-100';

          if (blockedInfo.blocked) {
            bgClass = 'bg-red-50';
            borderClass = 'border-red-100';
          } else if (isLunch) {
            bgClass = 'bg-amber-50';
            borderClass = 'border-amber-100';
          } else if (isMorning || isAfternoon) {
            bgClass = 'bg-green-50';
            borderClass = 'border-green-100';
          } else if (!isWorking) {
            bgClass = 'bg-gray-50';
            borderClass = 'border-gray-100';
          }

          return (
            <div
              key={hour}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, hour)}
              className={`flex gap-4 min-h-[70px] border-b ${borderClass} ${bgClass} hover:bg-opacity-70 transition-all`}
            >
              <div className="w-20 flex-shrink-0 pt-3 px-3 text-sm font-semibold text-gray-600 border-r border-gray-200">
                {formatHour(hour)}
              </div>

              <div className="flex-1 py-3 pr-3 space-y-2">
                {blockedInfo.blocked && (
                  <div className="p-2 bg-red-100 border-l-4 border-red-500 rounded flex items-center gap-2">
                    <Clock className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-medium text-red-900">{blockedInfo.label}</span>
                  </div>
                )}

                {isLunch && !blockedInfo.blocked && (
                  <div className="p-2 bg-amber-100 border-l-4 border-amber-500 rounded flex items-center gap-2">
                    <Utensils className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-medium text-amber-900">Lunch Break</span>
                  </div>
                )}

                {(isMorning || isAfternoon) && !blockedInfo.blocked && !isLunch && (
                  <div className="p-2 bg-green-100 border-l-4 border-green-500 rounded flex items-center gap-2">
                    <Coffee className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-900">
                      {isMorning ? 'Morning' : 'Afternoon'} Break
                    </span>
                  </div>
                )}

                {hourEvents.map(event => (
                  <div
                    key={event.id}
                    className="p-3 bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-500 rounded-lg shadow-sm"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-semibold text-blue-900">{event.title}</span>
                    </div>
                    <div className="text-xs text-blue-700 font-medium">
                      {event.start_time} - {event.end_time}
                    </div>
                  </div>
                ))}

                {hourBlocks.map(block => (
                  <AlignmentBlock key={block.id} block={block} onUpdate={onUpdate} />
                ))}

                {!blockedInfo.blocked &&
                  !isLunch &&
                  !isMorning &&
                  !isAfternoon &&
                  hourEvents.length === 0 &&
                  hourBlocks.length === 0 && (
                    <div className="h-14 flex items-center justify-center text-xs text-gray-400 border-2 border-dashed border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all">
                      {isWorking ? 'Drop work items here' : 'Outside working hours'}
                    </div>
                  )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
