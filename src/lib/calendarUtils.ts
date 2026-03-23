import type { CalendarEventWithMembers, EventColor, DayEvent } from './calendarTypes';

export function getMonthDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const endDate = new Date(lastDay);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

  const days: Date[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return days;
}

export function getWeekDays(date: Date): Date[] {
  const days: Date[] = [];
  const startOfWeek = new Date(date);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(day.getDate() + i);
    days.push(day);
  }

  return days;
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function formatWeekRange(startDate: Date): string {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);

  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
  const year = startDate.getFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDate.getDate()}-${endDate.getDate()}, ${year}`;
  }

  return `${startMonth} ${startDate.getDate()} - ${endMonth} ${endDate.getDate()}, ${year}`;
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export function formatEventTime(event: CalendarEventWithMembers): string {
  if (event.all_day) {
    return 'All day';
  }

  const start = new Date(event.start_at);
  const end = new Date(event.end_at);

  return `${formatTime(start)} - ${formatTime(end)}`;
}

// Legacy function for EventColor enum (backward compatibility)
// Also handles hex colors (new system)
export function getEventColor(color: EventColor | string): string {
  // If it's a hex color, use the hex color function
  if (typeof color === 'string' && color.startsWith('#')) {
    return getEventColorFromHex(color);
  }

  // Legacy EventColor enum handling
  const colors: Record<string, string> = {
    blue: 'bg-blue-100 border-blue-500 text-blue-900',
    red: 'bg-red-100 border-red-500 text-red-900',
    yellow: 'bg-yellow-100 border-yellow-500 text-yellow-900',
    green: 'bg-green-100 border-green-500 text-green-900',
    purple: 'bg-purple-100 border-purple-500 text-purple-900',
    gray: 'bg-gray-100 border-gray-500 text-gray-900',
    orange: 'bg-orange-100 border-orange-500 text-orange-900',
    pink: 'bg-pink-100 border-pink-500 text-pink-900'
  };

  return colors[color as string] || colors.blue;
}

// Legacy function for EventColor enum (backward compatibility)
// Also handles hex colors (new system)
export function getEventColorDot(color: EventColor | string): string {
  // If it's a hex color, use the hex color function
  if (typeof color === 'string' && color.startsWith('#')) {
    return getEventColorDotFromHex(color);
  }

  // Legacy EventColor enum handling
  const colors: Record<string, string> = {
    blue: 'bg-blue-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    gray: 'bg-gray-500',
    orange: 'bg-orange-500',
    pink: 'bg-pink-500'
  };

  return colors[color as string] || colors.blue;
}

/**
 * Convert hex color to Tailwind classes for event background/border/text
 * Returns a string of Tailwind classes suitable for event cards
 */
export function getEventColorFromHex(hexColor: string): string {
  // Map common hex colors to Tailwind classes
  const colorMap: Record<string, string> = {
    '#3B82F6': 'bg-blue-100 border-blue-500 text-blue-900', // blue
    '#6366F1': 'bg-indigo-100 border-indigo-500 text-indigo-900', // indigo
    '#10B981': 'bg-green-100 border-green-500 text-green-900', // green
    '#6B7280': 'bg-gray-100 border-gray-500 text-gray-900', // gray
    '#F59E0B': 'bg-amber-100 border-amber-500 text-amber-900', // amber
    '#22C55E': 'bg-emerald-100 border-emerald-500 text-emerald-900', // emerald
    '#F97316': 'bg-orange-100 border-orange-500 text-orange-900', // orange
    '#8B5CF6': 'bg-violet-100 border-violet-500 text-violet-900', // violet
    '#EF4444': 'bg-red-100 border-red-500 text-red-900', // red
    '#0EA5E9': 'bg-sky-100 border-sky-500 text-sky-900', // sky
    '#EC4899': 'bg-pink-100 border-pink-500 text-pink-900', // pink
  };

  // Normalize hex color (uppercase, ensure #)
  const normalized = hexColor.toUpperCase().startsWith('#') ? hexColor.toUpperCase() : `#${hexColor.toUpperCase()}`;
  
  return colorMap[normalized] || `bg-blue-100 border-blue-500 text-blue-900`; // Default to blue
}

/**
 * Convert hex color to Tailwind class for event color dot/indicator
 */
export function getEventColorDotFromHex(hexColor: string): string {
  const colorMap: Record<string, string> = {
    '#3B82F6': 'bg-blue-500',
    '#6366F1': 'bg-indigo-500',
    '#10B981': 'bg-green-500',
    '#6B7280': 'bg-gray-500',
    '#F59E0B': 'bg-amber-500',
    '#22C55E': 'bg-emerald-500',
    '#F97316': 'bg-orange-500',
    '#8B5CF6': 'bg-violet-500',
    '#EF4444': 'bg-red-500',
    '#0EA5E9': 'bg-sky-500',
    '#EC4899': 'bg-pink-500',
  };

  const normalized = hexColor.toUpperCase().startsWith('#') ? hexColor.toUpperCase() : `#${hexColor.toUpperCase()}`;
  
  return colorMap[normalized] || 'bg-blue-500';
}

/**
 * Get inline style for event background color (for custom hex colors not in Tailwind map)
 */
export function getEventColorStyle(hexColor: string): { backgroundColor: string; borderColor: string; color: string } {
  // Calculate lighter background color (20% opacity)
  const bgColor = hexToRgba(hexColor, 0.2);
  // Use full opacity for border
  const borderColor = hexColor;
  // Use darker version for text (or black if light)
  const textColor = getContrastColor(hexColor);

  return {
    backgroundColor: bgColor,
    borderColor: borderColor,
    color: textColor,
  };
}

/**
 * Convert hex to rgba
 */
function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.startsWith('#') ? hex.slice(1) : hex;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Get contrasting text color (black or white) based on background brightness
 */
function getContrastColor(hex: string): string {
  const normalized = hex.startsWith('#') ? hex.slice(1) : hex;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return black for light colors, white for dark colors
  return luminance > 0.5 ? '#1F2937' : '#FFFFFF';
}

export function getEventsForDay(
  events: CalendarEventWithMembers[],
  date: Date
): CalendarEventWithMembers[] {
  return events.filter(event => {
    const eventStart = new Date(event.start_at);
    const eventEnd = new Date(event.end_at);

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    return eventStart <= dayEnd && eventEnd >= dayStart;
  });
}

export function getDayEvents(
  events: CalendarEventWithMembers[],
  date: Date
): DayEvent[] {
  const dayEvents = getEventsForDay(events, date);

  return dayEvents.map(event => {
    const eventStart = new Date(event.start_at);
    const eventEnd = new Date(event.end_at);

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const isStart = isSameDay(eventStart, date);
    const isEnd = isSameDay(eventEnd, date);
    const isMultiDay = !isSameDay(eventStart, eventEnd);

    let startMinutes = 0;
    let endMinutes = 24 * 60;

    if (!event.all_day) {
      if (isStart) {
        startMinutes = eventStart.getHours() * 60 + eventStart.getMinutes();
      }

      if (isEnd) {
        endMinutes = eventEnd.getHours() * 60 + eventEnd.getMinutes();
      }
    }

    return {
      event,
      startMinutes,
      endMinutes,
      isMultiDay,
      isStart,
      isEnd
    };
  });
}

export function getTimeSlots(): string[] {
  const slots: string[] = [];

  for (let hour = 0; hour < 24; hour++) {
    const hourStr = hour.toString().padStart(2, '0');
    slots.push(`${hourStr}:00`);
    slots.push(`${hourStr}:30`);
  }

  return slots;
}

export function getTimeSlotPosition(minutes: number): number {
  return (minutes / (24 * 60)) * 100;
}

export function createDateFromTime(date: Date, timeString: string): Date {
  const [hours, minutes] = timeString.split(':').map(Number);
  const newDate = new Date(date);
  newDate.setHours(hours, minutes, 0, 0);
  return newDate;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export function startOfWeek(date: Date): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - result.getDay());
  result.setHours(0, 0, 0, 0);
  return result;
}

export function endOfWeek(date: Date): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + (6 - result.getDay()));
  result.setHours(23, 59, 59, 999);
  return result;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatTimeForInput(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatDateTimeForInput(date: Date): { date: string; time: string } {
  return {
    date: formatDateForInput(date),
    time: formatTimeForInput(date)
  };
}

export function parseDateTimeInput(dateStr: string, timeStr: string): Date {
  const date = new Date(dateStr);
  const [hours, minutes] = timeStr.split(':').map(Number);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export function roundToNearestHalfHour(date: Date): Date {
  const result = new Date(date);
  const minutes = result.getMinutes();

  if (minutes < 15) {
    result.setMinutes(0);
  } else if (minutes < 45) {
    result.setMinutes(30);
  } else {
    result.setMinutes(0);
    result.setHours(result.getHours() + 1);
  }

  result.setSeconds(0);
  result.setMilliseconds(0);

  return result;
}
