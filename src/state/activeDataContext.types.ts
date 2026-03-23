export type ADCFocusLevel = 'neutral' | 'drifting' | 'strict';
export type ADCSpaceType = 'personal' | 'shared';
export type ADCTaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done';
export type ADCCalendarView = 'day' | 'week' | 'month';

export interface ADCState {
  activeProjectId: string | null;
  activeDomainId: string | null;
  activeTrackId: string | null;
  activeSubtrackId: string | null;
  activeTaskId: string | null;
  activeTaskStatus: ADCTaskStatus | null;
  isFocusing: boolean;
  activeFocusSessionId: string | null;
  focusModeLevel: ADCFocusLevel;
  activeTimeBlockStart: string | null;
  activeTimeBlockEnd: string | null;
  activeCalendarView: ADCCalendarView;
  activeSpaceType: ADCSpaceType;
  activeSpaceId: string | null;
  activeOffshootId: string | null;
  activeSideProjectId: string | null;
}

export interface ADCContextUpdatePayloads {
  projectChanged: {
    projectId: string | null;
    domainId: string | null;
  };
  trackChanged: {
    trackId: string | null;
  };
  subtrackChanged: {
    subtrackId: string | null;
  };
  taskChanged: {
    taskId: string | null;
    status: ADCTaskStatus | null;
  };
  focusModeChanged: {
    isFocusing: boolean;
    sessionId: string | null;
    level: ADCFocusLevel;
  };
  spaceChanged: {
    spaceType: ADCSpaceType;
    spaceId: string | null;
  };
  offshootChanged: {
    offshootId: string | null;
  };
  sideProjectChanged: {
    sideProjectId: string | null;
  };
  timeBlockChanged: {
    start: string | null;
    end: string | null;
  };
  calendarViewChanged: {
    view: ADCCalendarView;
  };
}

export type ADCEventName = keyof ADCContextUpdatePayloads;

export type ADCEventsMap = {
  [K in ADCEventName]: (payload: ADCContextUpdatePayloads[K]) => void;
};

export type ADCEventCallback<T extends ADCEventName> = (
  payload: ADCContextUpdatePayloads[T]
) => void;
