/**
 * EventTypeSelector - Reusable event type selection component
 * 
 * Used in QuickAddPopover, EventDetailModal, PersonalEventModal, etc.
 */

import { Calendar, Users, CalendarCheck, Clock, Target, Repeat, Utensils, CheckSquare, Bell, Plane, Flag } from 'lucide-react';
import type { CalendarEventType } from '../../lib/personalSpaces/calendarService';

export interface EventTypeSelectorProps {
  value: CalendarEventType;
  onChange: (type: CalendarEventType) => void;
  className?: string;
  disabled?: boolean;
}

const EVENT_TYPE_OPTIONS: Array<{
  value: CalendarEventType;
  label: string;
  icon: typeof Calendar;
  description: string;
}> = [
  { value: 'event', label: 'Event', icon: Calendar, description: 'General event' },
  { value: 'meeting', label: 'Meeting', icon: Users, description: 'Scheduled meeting' },
  { value: 'appointment', label: 'Appointment', icon: CalendarCheck, description: 'Appointment' },
  { value: 'time_block', label: 'Time Block', icon: Clock, description: 'Focused work time' },
  { value: 'goal', label: 'Goal', icon: Target, description: 'Goal deadline' },
  { value: 'habit', label: 'Habit', icon: Repeat, description: 'Recurring habit' },
  { value: 'meal', label: 'Meal', icon: Utensils, description: 'Meal time' },
  { value: 'task', label: 'Task', icon: CheckSquare, description: 'Task deadline' },
  { value: 'reminder', label: 'Reminder', icon: Bell, description: 'Reminder' },
  { value: 'travel_segment', label: 'Travel', icon: Plane, description: 'Travel segment' },
  { value: 'milestone', label: 'Milestone', icon: Flag, description: 'Milestone' },
];

export function EventTypeSelector({
  value,
  onChange,
  className = '',
  disabled = false,
}: EventTypeSelectorProps) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Event Type
      </label>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {EVENT_TYPE_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = value === option.value;
          
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => !disabled && onChange(option.value)}
              disabled={disabled}
              className={`
                flex flex-col items-center gap-1.5 p-2.5 rounded-lg border-2 transition-all
                ${isSelected
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              title={option.description}
            >
              <Icon size={18} className={isSelected ? 'text-blue-600' : 'text-gray-500'} />
              <span className="text-xs font-medium text-center leading-tight">
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}






