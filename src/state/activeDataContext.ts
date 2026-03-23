import type {
  ADCState,
  ADCEventName,
  ADCContextUpdatePayloads,
  ADCEventCallback,
  ADCFocusLevel,
  ADCSpaceType,
  ADCTaskStatus,
  ADCCalendarView,
} from './activeDataContext.types';

const ADC_STORAGE_KEY = 'sharedminds_adc_state';

const PERSISTED_FIELDS: (keyof ADCState)[] = [
  'activeProjectId',
  'activeTrackId',
  'activeSubtrackId',
  'activeSpaceType',
  'activeSpaceId',
  'activeCalendarView',
];

type EventListeners = {
  [K in ADCEventName]?: Array<ADCEventCallback<K>>;
};

class ActiveDataContextStore {
  private state: ADCState;
  private listeners: EventListeners = {};

  constructor() {
    this.state = this.getInitialState();
    this.loadPersistedState();
  }

  private getInitialState(): ADCState {
    return {
      activeProjectId: null,
      activeDomainId: null,
      activeTrackId: null,
      activeSubtrackId: null,
      activeTaskId: null,
      activeTaskStatus: null,
      isFocusing: false,
      activeFocusSessionId: null,
      focusModeLevel: 'neutral',
      activeTimeBlockStart: null,
      activeTimeBlockEnd: null,
      activeCalendarView: 'week',
      activeSpaceType: 'personal',
      activeSpaceId: null,
      activeOffshootId: null,
      activeSideProjectId: null,
    };
  }

  /**
   * Phase 5: State Management Resilience - Added storage protection
   */
  private loadPersistedState(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(ADC_STORAGE_KEY);
      // Removed verbose logging - only log errors
      if (stored) {
        const parsed = JSON.parse(stored);
        PERSISTED_FIELDS.forEach((field) => {
          if (parsed[field] !== undefined) {
            (this.state as any)[field] = parsed[field];
          }
        });
      }
    } catch (error) {
      console.error('[ADC] Failed to load persisted state:', error);
    }
  }

  private persistState(): void {
    if (typeof window === 'undefined') return;

    try {
      const toPersist: Partial<ADCState> = {};
      PERSISTED_FIELDS.forEach((field) => {
        toPersist[field] = this.state[field];
      });
      localStorage.setItem(ADC_STORAGE_KEY, JSON.stringify(toPersist));
    } catch (error) {
      console.error('[ADC] Failed to persist state:', error);
    }
  }

  public getState(): Readonly<ADCState> {
    return { ...this.state };
  }

  public subscribe<T extends ADCEventName>(
    eventName: T,
    callback: ADCEventCallback<T>
  ): () => void {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    (this.listeners[eventName] as Array<ADCEventCallback<T>>).push(callback);

    return () => {
      const callbacks = this.listeners[eventName];
      if (callbacks) {
        const index = callbacks.indexOf(callback as any);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  private emit<T extends ADCEventName>(
    eventName: T,
    payload: ADCContextUpdatePayloads[T]
  ): void {
    const callbacks = this.listeners[eventName];
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(payload);
        } catch (error) {
          console.error(`[ADC] Error in ${eventName} listener:`, error);
        }
      });
    }
  }

  public setActiveProjectId(
    projectId: string | null,
    domainId: string | null = null
  ): void {
    // Removed verbose logging - only log errors

    const changed =
      this.state.activeProjectId !== projectId ||
      this.state.activeDomainId !== domainId;

    this.state.activeProjectId = projectId;
    this.state.activeDomainId = domainId;

    if (changed) {
      console.log('[ADC] Project changed, resetting related contexts');
      this.resetTrackContext();
      this.resetTaskContext();
      this.resetFocusContext();
      this.resetOffshootContext();
      this.resetSideProjectContext();
      this.persistState();
      this.emit('projectChanged', { projectId, domainId });
    }
  }

  public setActiveTrackId(trackId: string | null): void {
    if (this.state.activeTrackId !== trackId) {
      this.state.activeTrackId = trackId;
      this.state.activeSubtrackId = null;
      this.resetTaskContext();
      this.persistState();
      this.emit('trackChanged', { trackId });
    }
  }

  public setActiveSubtrackId(subtrackId: string | null): void {
    if (this.state.activeSubtrackId !== subtrackId) {
      this.state.activeSubtrackId = subtrackId;
      this.resetTaskContext();
      this.emit('subtrackChanged', { subtrackId });
    }
  }

  public setActiveTask(taskId: string | null, status: ADCTaskStatus | null): void {
    if (
      this.state.activeTaskId !== taskId ||
      this.state.activeTaskStatus !== status
    ) {
      this.state.activeTaskId = taskId;
      this.state.activeTaskStatus = status;
      this.emit('taskChanged', { taskId, status });
    }
  }

  public startFocusSession(
    sessionId: string,
    level: ADCFocusLevel = 'neutral'
  ): void {
    this.state.isFocusing = true;
    this.state.activeFocusSessionId = sessionId;
    this.state.focusModeLevel = level;
    this.emit('focusModeChanged', {
      isFocusing: true,
      sessionId,
      level,
    });
  }

  public endFocusSession(): void {
    this.state.isFocusing = false;
    this.state.activeFocusSessionId = null;
    this.state.focusModeLevel = 'neutral';
    this.emit('focusModeChanged', {
      isFocusing: false,
      sessionId: null,
      level: 'neutral',
    });
  }

  public setFocusModeLevel(level: ADCFocusLevel): void {
    if (this.state.focusModeLevel !== level) {
      this.state.focusModeLevel = level;
      this.emit('focusModeChanged', {
        isFocusing: this.state.isFocusing,
        sessionId: this.state.activeFocusSessionId,
        level,
      });
    }
  }

  public setActiveTimeBlock(start: string | null, end: string | null): void {
    if (
      this.state.activeTimeBlockStart !== start ||
      this.state.activeTimeBlockEnd !== end
    ) {
      this.state.activeTimeBlockStart = start;
      this.state.activeTimeBlockEnd = end;
      this.emit('timeBlockChanged', { start, end });
    }
  }

  public setActiveCalendarView(view: ADCCalendarView): void {
    if (this.state.activeCalendarView !== view) {
      this.state.activeCalendarView = view;
      this.persistState();
      this.emit('calendarViewChanged', { view });
    }
  }

  public setSpaceContext(
    spaceType: ADCSpaceType,
    spaceId: string | null = null
  ): void {
    if (
      this.state.activeSpaceType !== spaceType ||
      this.state.activeSpaceId !== spaceId
    ) {
      this.state.activeSpaceType = spaceType;
      this.state.activeSpaceId = spaceId;
      this.persistState();
      this.emit('spaceChanged', { spaceType, spaceId });
    }
  }

  public setActiveOffshoot(offshootId: string | null): void {
    if (this.state.activeOffshootId !== offshootId) {
      this.state.activeOffshootId = offshootId;
      this.emit('offshootChanged', { offshootId });
    }
  }

  public setActiveSideProject(sideProjectId: string | null): void {
    if (this.state.activeSideProjectId !== sideProjectId) {
      this.state.activeSideProjectId = sideProjectId;
      this.emit('sideProjectChanged', { sideProjectId });
    }
  }

  public resetTrackContext(): void {
    this.state.activeTrackId = null;
    this.state.activeSubtrackId = null;
    this.resetTaskContext();
  }

  public resetTaskContext(): void {
    this.state.activeTaskId = null;
    this.state.activeTaskStatus = null;
  }

  public resetFocusContext(): void {
    if (this.state.isFocusing) {
      this.endFocusSession();
    }
  }

  public resetOffshootContext(): void {
    this.state.activeOffshootId = null;
  }

  public resetSideProjectContext(): void {
    this.state.activeSideProjectId = null;
  }

  public resetAll(): void {
    this.state = this.getInitialState();
    this.persistState();
  }
}

export const adcStore = new ActiveDataContextStore();

export const getADCState = () => adcStore.getState();
export const subscribeToADC = adcStore.subscribe.bind(adcStore);
export const setActiveProjectId = adcStore.setActiveProjectId.bind(adcStore);
export const setActiveTrackId = adcStore.setActiveTrackId.bind(adcStore);
export const setActiveSubtrackId = adcStore.setActiveSubtrackId.bind(adcStore);
export const setActiveTask = adcStore.setActiveTask.bind(adcStore);
export const startFocusSession = adcStore.startFocusSession.bind(adcStore);
export const endFocusSession = adcStore.endFocusSession.bind(adcStore);
export const setFocusModeLevel = adcStore.setFocusModeLevel.bind(adcStore);
export const setActiveTimeBlock = adcStore.setActiveTimeBlock.bind(adcStore);
export const setActiveCalendarView = adcStore.setActiveCalendarView.bind(adcStore);
export const setSpaceContext = adcStore.setSpaceContext.bind(adcStore);
export const setActiveOffshoot = adcStore.setActiveOffshoot.bind(adcStore);
export const setActiveSideProject = adcStore.setActiveSideProject.bind(adcStore);
export const resetTrackContext = adcStore.resetTrackContext.bind(adcStore);
export const resetTaskContext = adcStore.resetTaskContext.bind(adcStore);
export const resetFocusContext = adcStore.resetFocusContext.bind(adcStore);
export const resetOffshootContext = adcStore.resetOffshootContext.bind(adcStore);
export const resetSideProjectContext = adcStore.resetSideProjectContext.bind(adcStore);
export const resetAllADC = adcStore.resetAll.bind(adcStore);
