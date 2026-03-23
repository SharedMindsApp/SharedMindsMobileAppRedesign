export interface TimelineConfig {
  startDate: Date;
  endDate: Date;
  totalDays: number;
  displayUnit: 'day' | 'week' | 'month';
  columns: TimelineColumn[];
}

export interface TimelineColumn {
  date: Date;
  label: string;
  isWeekend?: boolean;
}

export interface ItemPosition {
  left: number;
  width: number;
  startDate: Date;
  endDate: Date;
}

export function calculateTimeline(
  projectStartDate: string,
  projectEndDate: string
): TimelineConfig {
  const start = new Date(projectStartDate);
  const end = new Date(projectEndDate);

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  const totalDays = daysBetween(start, end) + 1;

  let displayUnit: 'day' | 'week' | 'month' = 'day';
  if (totalDays > 90) {
    displayUnit = 'month';
  } else if (totalDays > 30) {
    displayUnit = 'week';
  }

  const columns = generateTimelineColumns(start, end, displayUnit);

  return {
    startDate: start,
    endDate: end,
    totalDays,
    displayUnit,
    columns,
  };
}

function generateTimelineColumns(
  start: Date,
  end: Date,
  unit: 'day' | 'week' | 'month'
): TimelineColumn[] {
  const columns: TimelineColumn[] = [];
  const current = new Date(start);

  while (current <= end) {
    const label = formatColumnLabel(current, unit);
    const isWeekend = current.getDay() === 0 || current.getDay() === 6;

    columns.push({
      date: new Date(current),
      label,
      isWeekend,
    });

    if (unit === 'day') {
      current.setDate(current.getDate() + 1);
    } else if (unit === 'week') {
      current.setDate(current.getDate() + 7);
    } else {
      current.setMonth(current.getMonth() + 1);
    }
  }

  return columns;
}

function formatColumnLabel(date: Date, unit: 'day' | 'week' | 'month'): string {
  if (unit === 'day') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } else if (unit === 'week') {
    const weekStart = new Date(date);
    const weekEnd = new Date(date);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
}

export function positionItem(
  itemStartDate: string,
  itemEndDate: string,
  timelineStartDate: Date,
  timelineEndDate: Date,
  containerWidth: number
): ItemPosition {
  const start = new Date(itemStartDate);
  const end = new Date(itemEndDate);

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  const clampedStart = new Date(Math.max(start.getTime(), timelineStartDate.getTime()));
  const clampedEnd = new Date(Math.min(end.getTime(), timelineEndDate.getTime()));

  const totalTimelineDays = daysBetween(timelineStartDate, timelineEndDate) + 1;
  const daysFromStart = daysBetween(timelineStartDate, clampedStart);
  const itemDuration = daysBetween(clampedStart, clampedEnd) + 1;

  const left = (daysFromStart / totalTimelineDays) * containerWidth;
  const width = Math.max((itemDuration / totalTimelineDays) * containerWidth, 40);

  return {
    left,
    width,
    startDate: start,
    endDate: end,
  };
}

export function daysBetween(start: Date, end: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const startMs = new Date(start).setHours(0, 0, 0, 0);
  const endMs = new Date(end).setHours(0, 0, 0, 0);
  return Math.round((endMs - startMs) / msPerDay);
}

export function calculateProjectBounds(
  items: Array<{ start_date: string; end_date: string }>
): { startDate: string; endDate: string } | null {
  if (items.length === 0) {
    return null;
  }

  let minDate = new Date(items[0].start_date);
  let maxDate = new Date(items[0].end_date);

  items.forEach((item) => {
    const start = new Date(item.start_date);
    const end = new Date(item.end_date);

    if (start < minDate) minDate = start;
    if (end > maxDate) maxDate = end;
  });

  const buffer = 7;
  minDate.setDate(minDate.getDate() - buffer);
  maxDate.setDate(maxDate.getDate() + buffer);

  return {
    startDate: minDate.toISOString().split('T')[0],
    endDate: maxDate.toISOString().split('T')[0],
  };
}

export function getDefaultColors(): string[] {
  return [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
    '#06b6d4',
    '#84cc16',
  ];
}

export function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const startStr = start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: start.getFullYear() !== end.getFullYear() ? 'numeric' : undefined
  });

  const endStr = end.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return `${startStr} - ${endStr}`;
}
