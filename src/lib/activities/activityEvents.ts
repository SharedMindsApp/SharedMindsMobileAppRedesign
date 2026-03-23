/**
 * Activity Events Bus
 * 
 * Lightweight event emitter for activity changes (habits, goals, check-ins).
 * Enables live synchronization between calendar views and tracker widgets.
 * 
 * Usage:
 * - Services emit events when activities change
 * - Components subscribe to refresh their data
 * - Debounced to avoid spam
 */

type ActivityChangeCallback = (activityId?: string) => void;

class ActivityEventBus {
  private subscribers: Set<ActivityChangeCallback> = new Set();
  private debounceTimer: NodeJS.Timeout | null = null;
  private lastEmitTime: number = 0;
  private readonly DEBOUNCE_MS = 200;

  /**
   * Subscribe to activity change events
   * Returns unsubscribe function
   */
  subscribe(callback: ActivityChangeCallback): () => void {
    this.subscribers.add(callback);
    
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Emit activity change event
   * Debounced to avoid spam from rapid changes
   */
  emit(activityId?: string): void {
    const now = Date.now();
    
    // Clear existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // If recent emit, debounce
    if (now - this.lastEmitTime < this.DEBOUNCE_MS) {
      this.debounceTimer = setTimeout(() => {
        this.emitImmediate(activityId);
      }, this.DEBOUNCE_MS);
    } else {
      // Emit immediately if enough time has passed
      this.emitImmediate(activityId);
    }
  }

  /**
   * Emit immediately (internal)
   */
  private emitImmediate(activityId?: string): void {
    this.lastEmitTime = Date.now();
    
    // Notify all subscribers
    this.subscribers.forEach(callback => {
      try {
        callback(activityId);
      } catch (error) {
        console.error('[activityEvents] Error in subscriber callback:', error);
      }
    });
  }

  /**
   * Get subscriber count (for diagnostics)
   */
  getSubscriberCount(): number {
    return this.subscribers.size;
  }

  /**
   * Get last emit time (for diagnostics)
   */
  getLastEmitTime(): number {
    return this.lastEmitTime;
  }
}

// Singleton instance
export const activityEvents = new ActivityEventBus();

/**
 * Emit activity change event
 * Call this from services when activities change
 */
export function emitActivityChanged(activityId?: string): void {
  activityEvents.emit(activityId);
}

/**
 * Subscribe to activity change events
 * Returns unsubscribe function
 */
export function subscribeActivityChanged(callback: ActivityChangeCallback): () => void {
  return activityEvents.subscribe(callback);
}






