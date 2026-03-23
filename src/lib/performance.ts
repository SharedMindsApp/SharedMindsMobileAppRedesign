/**
 * Performance Utilities
 * 
 * Dev-only performance marks and measures for diagnosing bottlenecks.
 * All functions are no-ops in production.
 */

const isDev = import.meta.env.DEV;

/**
 * Mark a performance point
 */
export function mark(name: string): void {
  if (isDev && typeof performance !== 'undefined' && performance.mark) {
    performance.mark(name);
  }
}

/**
 * Measure time between two marks
 */
export function measure(name: string, startMark: string, endMark: string): void {
  if (isDev && typeof performance !== 'undefined' && performance.measure) {
    try {
      performance.measure(name, startMark, endMark);
      const measure = performance.getEntriesByName(name, 'measure')[0];
      if (measure) {
        console.log(`[Performance] ${name}: ${measure.duration.toFixed(2)}ms`);
      }
    } catch (error) {
      // Marks might not exist yet
      console.warn(`[Performance] Could not measure ${name}:`, error);
    }
  }
}

/**
 * Time an async function
 */
export async function timeAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const startMark = `${name}:start`;
  const endMark = `${name}:end`;
  
  mark(startMark);
  try {
    const result = await fn();
    mark(endMark);
    measure(name, startMark, endMark);
    return result;
  } catch (error) {
    mark(endMark);
    measure(`${name}:error`, startMark, endMark);
    throw error;
  }
}

/**
 * Mark dashboard lifecycle events
 */
export const DashboardMarks = {
  start: () => mark('dashboard:start'),
  shellVisible: () => mark('dashboard:shell:visible'),
  skeletonsVisible: () => mark('dashboard:skeletons:visible'),
  criticalDataLoaded: () => mark('dashboard:critical:loaded'),
  allDataLoaded: () => mark('dashboard:all:loaded'),
  interactive: () => mark('dashboard:interactive'),
};

/**
 * Mark meal planner lifecycle events
 */
export const MealPlannerMarks = {
  start: () => mark('meal-planner:start'),
  visible: () => mark('meal-planner:visible'),
  dataLoaded: () => mark('meal-planner:data:loaded'),
  interactive: () => mark('meal-planner:interactive'),
};

/**
 * Get all performance measures (dev only)
 */
export function getPerformanceReport(): Array<{ name: string; duration: number }> {
  if (!isDev || typeof performance === 'undefined') {
    return [];
  }
  
  const measures = performance.getEntriesByType('measure');
  return measures.map(entry => ({
    name: entry.name,
    duration: entry.duration,
  }));
}
