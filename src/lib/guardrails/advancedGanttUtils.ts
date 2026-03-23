export type ZoomLevel = 'day' | 'week' | 'month' | 'quarter';

export interface AdvancedTimelineConfig {
  anchorDate: Date;
  zoomLevel: ZoomLevel;
  columns: TimelineColumn[];
  columnWidth: number;
  viewportWidth: number;
  scrollLeft: number;
}

export interface TimelineColumn {
  date: Date;
  label: string;
  secondaryLabel?: string;
  isWeekend?: boolean;
  isToday?: boolean;
  isPast?: boolean;
  width: number;
  left: number;
}

export interface ItemPosition {
  left: number;
  width: number;
  startDate: Date;
  endDate: Date;
}

export interface DragResult {
  newStartDate: string;
  newEndDate: string;
}

const ZOOM_CONFIG: Record<ZoomLevel, { columnWidth: number; labelFormat: string }> = {
  day: { columnWidth: 40, labelFormat: 'day' },
  week: { columnWidth: 56, labelFormat: 'week' }, // 7 days * 8px
  month: { columnWidth: 90, labelFormat: 'month' }, // ~30 days * 3px
  quarter: { columnWidth: 90, labelFormat: 'quarter' }, // ~90 days * 1px
};

// Get column width for a zoom level
export function getColumnWidth(zoomLevel: ZoomLevel): number {
  const config = ZOOM_CONFIG[zoomLevel];
  if (!config) {
    console.warn(`Invalid zoom level: ${zoomLevel}, defaulting to 'week'`);
    return ZOOM_CONFIG.week.columnWidth;
  }
  return config.columnWidth;
}

// Start of unit based on zoom level
export function startOfUnit(date: Date, zoomLevel: ZoomLevel): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);

  switch (zoomLevel) {
    case 'day':
      return result;
    case 'week':
      // Start of week (Monday)
      const day = result.getDay();
      const diff = day === 0 ? 6 : day - 1;
      result.setDate(result.getDate() - diff);
      return result;
    case 'month':
      result.setDate(1);
      return result;
    case 'quarter':
      const quarter = Math.floor(result.getMonth() / 3);
      result.setMonth(quarter * 3, 1);
      return result;
  }
}

// Add units to a date
export function addUnits(date: Date, amount: number, zoomLevel: ZoomLevel): Date {
  const result = new Date(date);

  switch (zoomLevel) {
    case 'day':
      result.setDate(result.getDate() + amount);
      break;
    case 'week':
      result.setDate(result.getDate() + (amount * 7));
      break;
    case 'month':
      result.setMonth(result.getMonth() + amount);
      break;
    case 'quarter':
      result.setMonth(result.getMonth() + (amount * 3));
      break;
  }

  return result;
}

// Get difference in units between two dates
export function diffInUnits(date1: Date, date2: Date, zoomLevel: ZoomLevel): number {
  const start = startOfUnit(date1, zoomLevel);
  const end = startOfUnit(date2, zoomLevel);

  switch (zoomLevel) {
    case 'day':
      return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    case 'week':
      return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7));
    case 'month': {
      const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      return months;
    }
    case 'quarter': {
      const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      return Math.floor(months / 3);
    }
  }
}

// Convert date to X position based on anchor
export function dateToX(date: Date, anchorDate: Date, zoomLevel: ZoomLevel): number {
  const units = diffInUnits(anchorDate, date, zoomLevel);
  return units * getColumnWidth(zoomLevel);
}

// Convert X position to date based on anchor
export function xToDate(x: number, anchorDate: Date, zoomLevel: ZoomLevel): Date {
  const columnWidth = getColumnWidth(zoomLevel);
  const units = Math.floor(x / columnWidth);
  return addUnits(anchorDate, units, zoomLevel);
}

// Create windowed timeline for infinite scrolling
export function createWindowedTimeline(
  anchorDate: Date,
  zoomLevel: ZoomLevel,
  viewportWidth: number,
  scrollLeft: number
): AdvancedTimelineConfig {
  const columnWidth = getColumnWidth(zoomLevel);

  // Calculate how many columns to render (viewport + buffer on each side)
  const bufferMultiplier = 2;
  const totalVisibleWidth = viewportWidth * (1 + bufferMultiplier * 2);
  const numColumns = Math.ceil(totalVisibleWidth / columnWidth);

  // Calculate the first column to render based on scroll position
  const scrollOffset = scrollLeft - (viewportWidth * bufferMultiplier);
  const firstColumnIndex = Math.floor(scrollOffset / columnWidth);

  const columns = generateWindowedColumns(
    anchorDate,
    zoomLevel,
    firstColumnIndex,
    numColumns,
    columnWidth
  );

  return {
    anchorDate,
    zoomLevel,
    columns,
    columnWidth,
    viewportWidth,
    scrollLeft,
  };
}

function generateWindowedColumns(
  anchorDate: Date,
  zoomLevel: ZoomLevel,
  firstColumnIndex: number,
  numColumns: number,
  columnWidth: number
): TimelineColumn[] {
  const columns: TimelineColumn[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < numColumns; i++) {
    const columnIndex = firstColumnIndex + i;
    const columnDate = addUnits(anchorDate, columnIndex, zoomLevel);
    const position = columnIndex * columnWidth;

    let label = '';
    let secondaryLabel: string | undefined;
    let isWeekend = false;
    let isToday = false;
    let isPast = false;

    switch (zoomLevel) {
      case 'day': {
        isWeekend = columnDate.getDay() === 0 || columnDate.getDay() === 6;
        isToday = columnDate.getTime() === today.getTime();
        isPast = columnDate < today;
        label = columnDate.toLocaleDateString('en-US', { day: 'numeric' });
        secondaryLabel = columnDate.toLocaleDateString('en-US', { month: 'short' });
        break;
      }
      case 'week': {
        const weekEnd = new Date(columnDate);
        weekEnd.setDate(weekEnd.getDate() + 6);
        isToday = columnDate <= today && weekEnd >= today;
        isPast = weekEnd < today;
        label = `Week of ${columnDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        break;
      }
      case 'month': {
        const monthEnd = new Date(columnDate.getFullYear(), columnDate.getMonth() + 1, 0);
        isToday = columnDate <= today && monthEnd >= today;
        isPast = monthEnd < today;
        label = columnDate.toLocaleDateString('en-US', { month: 'short' });
        secondaryLabel = columnDate.getFullYear().toString();
        break;
      }
      case 'quarter': {
        const quarterEnd = new Date(columnDate.getFullYear(), columnDate.getMonth() + 3, 0);
        isToday = columnDate <= today && quarterEnd >= today;
        isPast = quarterEnd < today;
        const quarterNum = Math.floor(columnDate.getMonth() / 3) + 1;
        label = `Q${quarterNum}`;
        secondaryLabel = columnDate.getFullYear().toString();
        break;
      }
    }

    columns.push({
      date: columnDate,
      label,
      secondaryLabel,
      isWeekend,
      isToday,
      isPast,
      width: columnWidth,
      left: position,
    });
  }

  return columns;
}

export function positionItemOnTimeline(
  itemStartDate: string | Date,
  itemEndDate: string | Date,
  anchorDate: Date,
  zoomLevel: ZoomLevel
): ItemPosition {
  const start = new Date(itemStartDate);
  const end = new Date(itemEndDate);

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  const startX = dateToX(start, anchorDate, zoomLevel);
  const endX = dateToX(end, anchorDate, zoomLevel);
  const width = Math.max(endX - startX + getColumnWidth(zoomLevel), 40);

  return {
    left: startX,
    width,
    startDate: start,
    endDate: end,
  };
}

export function calculateDateFromPosition(
  pixelX: number,
  anchorDate: Date,
  zoomLevel: ZoomLevel
): Date {
  return xToDate(pixelX, anchorDate, zoomLevel);
}

export function calculateDragResult(
  originalStart: string | Date,
  originalEnd: string | Date,
  deltaX: number,
  anchorDate: Date,
  zoomLevel: ZoomLevel,
  dragType: 'move' | 'resize-left' | 'resize-right'
): DragResult {
  const columnWidth = getColumnWidth(zoomLevel);
  const unitsMoved = Math.round(deltaX / columnWidth);

  let newStart = new Date(originalStart);
  let newEnd = new Date(originalEnd);

  if (dragType === 'move') {
    newStart = addUnits(newStart, unitsMoved, zoomLevel);
    newEnd = addUnits(newEnd, unitsMoved, zoomLevel);
  } else if (dragType === 'resize-left') {
    newStart = addUnits(newStart, unitsMoved, zoomLevel);
    if (newStart > newEnd) {
      newStart = new Date(newEnd);
    }
  } else if (dragType === 'resize-right') {
    newEnd = addUnits(newEnd, unitsMoved, zoomLevel);
    if (newEnd < newStart) {
      newEnd = new Date(newStart);
    }
  }

  return {
    newStartDate: formatDateForDB(newStart),
    newEndDate: formatDateForDB(newEnd),
  };
}

export function daysBetween(start: Date, end: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const startMs = new Date(start).setHours(0, 0, 0, 0);
  const endMs = new Date(end).setHours(0, 0, 0, 0);
  return Math.round((endMs - startMs) / msPerDay);
}

export function formatDateForDB(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayPosition(anchorDate: Date, zoomLevel: ZoomLevel): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dateToX(today, anchorDate, zoomLevel);
}

// Shift anchor to keep scroll position bounded
export function shouldShiftAnchor(
  scrollLeft: number,
  viewportWidth: number,
  columnWidth: number
): { shouldShift: boolean; direction: 'left' | 'right'; shiftAmount: number } {
  const bufferWidth = viewportWidth * 2;
  const scrollThreshold = columnWidth * 10; // Shift when 10 columns away from edge

  if (scrollLeft < scrollThreshold) {
    // Near left edge, shift left
    const shiftAmount = Math.floor(bufferWidth / columnWidth);
    return { shouldShift: true, direction: 'left', shiftAmount: -shiftAmount };
  }

  const virtualWidth = bufferWidth * 3; // Total virtual scrollable width
  if (scrollLeft > virtualWidth - viewportWidth - scrollThreshold) {
    // Near right edge, shift right
    const shiftAmount = Math.floor(bufferWidth / columnWidth);
    return { shouldShift: true, direction: 'right', shiftAmount };
  }

  return { shouldShift: false, direction: 'left', shiftAmount: 0 };
}

export function autoDetectZoomLevel(totalDays: number): ZoomLevel {
  if (totalDays <= 30) return 'day';
  if (totalDays <= 90) return 'week';
  if (totalDays <= 365) return 'month';
  return 'quarter';
}

export function calculateSmartBounds(
  items: Array<{ start_date: string; end_date: string }>
): { startDate: string; endDate: string } | null {
  if (items.length === 0) {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 7);
    const end = new Date(today);
    end.setDate(end.getDate() + 90);

    return {
      startDate: formatDateForDB(start),
      endDate: formatDateForDB(end),
    };
  }

  let minDate = new Date(items[0].start_date);
  let maxDate = new Date(items[0].end_date);

  items.forEach((item) => {
    const start = new Date(item.start_date);
    const end = new Date(item.end_date);

    if (start < minDate) minDate = start;
    if (end > maxDate) maxDate = end;
  });

  const buffer = 14;
  minDate.setDate(minDate.getDate() - buffer);
  maxDate.setDate(maxDate.getDate() + buffer);

  return {
    startDate: formatDateForDB(minDate),
    endDate: formatDateForDB(maxDate),
  };
}
