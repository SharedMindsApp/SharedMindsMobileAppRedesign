export type ZoomLevel = 'day' | 'week' | 'month';

export interface TimelineColumn {
  date: Date;
  label: string;
  x: number;
  width: number;
}

export interface TimelineConfig {
  zoomLevel: ZoomLevel;
  columnWidth: number;
  today: Date;
  scrollX: number;
  viewportWidth: number;
}

const COLUMN_WIDTHS: Record<ZoomLevel, number> = {
  day: 60,
  week: 120,
  month: 180,
};

export function getColumnWidth(zoom: ZoomLevel): number {
  return COLUMN_WIDTHS[zoom];
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function startOfUnit(date: Date, zoom: ZoomLevel): Date {
  switch (zoom) {
    case 'day':
      return startOfDay(date);
    case 'week':
      return startOfWeek(date);
    case 'month':
      return startOfMonth(date);
  }
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

export function addUnits(date: Date, units: number, zoom: ZoomLevel): Date {
  switch (zoom) {
    case 'day':
      return addDays(date, units);
    case 'week':
      return addWeeks(date, units);
    case 'month':
      return addMonths(date, units);
  }
}

export function formatColumnLabel(date: Date, zoom: ZoomLevel): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  switch (zoom) {
    case 'day':
      return `${days[date.getDay()]} ${date.getDate()}`;
    case 'week':
      const weekEnd = addDays(date, 6);
      return `${months[date.getMonth()]} ${date.getDate()}-${weekEnd.getDate()}`;
    case 'month':
      return `${months[date.getMonth()]} ${date.getFullYear()}`;
  }
}

export function generateTimelineColumns(config: TimelineConfig): TimelineColumn[] {
  const { zoomLevel, columnWidth, scrollX, viewportWidth, today } = config;

  const columns: TimelineColumn[] = [];
  const overscan = 5;

  const visibleColumns = Math.ceil(viewportWidth / columnWidth);
  const totalColumns = visibleColumns + (overscan * 2);

  const todaySnapped = startOfUnit(today, zoomLevel);
  const todayX = 0;

  const firstColumnIndex = Math.floor((scrollX - (overscan * columnWidth)) / columnWidth);

  for (let i = 0; i < totalColumns; i++) {
    const columnIndex = firstColumnIndex + i;
    const columnDate = addUnits(todaySnapped, columnIndex, zoomLevel);

    columns.push({
      date: columnDate,
      label: formatColumnLabel(columnDate, zoomLevel),
      x: columnIndex * columnWidth,
      width: columnWidth,
    });
  }

  return columns;
}

export function dateToPosition(date: Date, zoom: ZoomLevel, columnWidth: number, todayDate: Date): number {
  const todaySnapped = startOfUnit(todayDate, zoom);
  const dateSnapped = startOfUnit(date, zoom);

  const daysDiff = Math.floor((dateSnapped.getTime() - todaySnapped.getTime()) / (1000 * 60 * 60 * 24));

  let unitsDiff: number;
  switch (zoom) {
    case 'day':
      unitsDiff = daysDiff;
      break;
    case 'week':
      unitsDiff = Math.floor(daysDiff / 7);
      break;
    case 'month':
      unitsDiff = Math.floor(daysDiff / 30);
      break;
  }

  return unitsDiff * columnWidth;
}

export function positionToDate(x: number, zoom: ZoomLevel, columnWidth: number, todayDate: Date): Date {
  const columnIndex = Math.floor(x / columnWidth);
  const todaySnapped = startOfUnit(todayDate, zoom);
  return addUnits(todaySnapped, columnIndex, zoom);
}

export function getTodayIndicatorPosition(zoom: ZoomLevel, columnWidth: number): number {
  return 0;
}

export function isToday(date: Date, today: Date): boolean {
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

export function isSameUnit(date1: Date, date2: Date, zoom: ZoomLevel): boolean {
  const d1 = startOfUnit(date1, zoom);
  const d2 = startOfUnit(date2, zoom);
  return d1.getTime() === d2.getTime();
}

export function formatDateForDisplay(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function formatDateForDB(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateFromDB(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}
