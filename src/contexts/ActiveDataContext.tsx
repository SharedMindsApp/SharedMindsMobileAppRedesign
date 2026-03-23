import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  adcStore,
  getADCState,
  subscribeToADC,
  setActiveProjectId as setProjectId,
  setActiveTrackId as setTrackId,
  setActiveSubtrackId as setSubtrackId,
  setActiveTask as setTask,
  startFocusSession as startSession,
  endFocusSession as endSession,
  setFocusModeLevel as setFocusLevel,
  setActiveTimeBlock as setTimeBlock,
  setActiveCalendarView as setCalendarView,
  setSpaceContext as setSpace,
  setActiveOffshoot as setOffshoot,
  setActiveSideProject as setSideProject,
  resetTrackContext as resetTrack,
  resetTaskContext as resetTask,
  resetFocusContext as resetFocus,
  resetOffshootContext as resetOffshoot,
  resetSideProjectContext as resetSideProject,
  resetAllADC,
} from '../state/activeDataContext';
import type {
  ADCState,
  ADCFocusLevel,
  ADCSpaceType,
  ADCTaskStatus,
  ADCCalendarView,
  ADCEventName,
  ADCEventCallback,
} from '../state/activeDataContext.types';

interface ActiveDataContextType {
  state: ADCState;
  setActiveProjectId: (projectId: string | null, domainId?: string | null) => void;
  setActiveTrackId: (trackId: string | null) => void;
  setActiveSubtrackId: (subtrackId: string | null) => void;
  setActiveTask: (taskId: string | null, status: ADCTaskStatus | null) => void;
  startFocusSession: (sessionId: string, level?: ADCFocusLevel) => void;
  endFocusSession: () => void;
  setFocusModeLevel: (level: ADCFocusLevel) => void;
  setActiveTimeBlock: (start: string | null, end: string | null) => void;
  setActiveCalendarView: (view: ADCCalendarView) => void;
  setSpaceContext: (spaceType: ADCSpaceType, spaceId?: string | null) => void;
  setActiveOffshoot: (offshootId: string | null) => void;
  setActiveSideProject: (sideProjectId: string | null) => void;
  resetTrackContext: () => void;
  resetTaskContext: () => void;
  resetFocusContext: () => void;
  resetOffshootContext: () => void;
  resetSideProjectContext: () => void;
  resetAll: () => void;
  subscribe: <T extends ADCEventName>(
    eventName: T,
    callback: ADCEventCallback<T>
  ) => () => void;
}

const ActiveDataContext = createContext<ActiveDataContextType | undefined>(undefined);

export function ActiveDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ADCState>(getADCState());

  useEffect(() => {
    const unsubscribers: Array<() => void> = [];

    unsubscribers.push(
      subscribeToADC('projectChanged', () => setState(getADCState())),
      subscribeToADC('trackChanged', () => setState(getADCState())),
      subscribeToADC('subtrackChanged', () => setState(getADCState())),
      subscribeToADC('taskChanged', () => setState(getADCState())),
      subscribeToADC('focusModeChanged', () => setState(getADCState())),
      subscribeToADC('spaceChanged', () => setState(getADCState())),
      subscribeToADC('offshootChanged', () => setState(getADCState())),
      subscribeToADC('sideProjectChanged', () => setState(getADCState())),
      subscribeToADC('timeBlockChanged', () => setState(getADCState())),
      subscribeToADC('calendarViewChanged', () => setState(getADCState()))
    );

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, []);

  const value: ActiveDataContextType = {
    state,
    setActiveProjectId: setProjectId,
    setActiveTrackId: setTrackId,
    setActiveSubtrackId: setSubtrackId,
    setActiveTask: setTask,
    startFocusSession: startSession,
    endFocusSession: endSession,
    setFocusModeLevel: setFocusLevel,
    setActiveTimeBlock: setTimeBlock,
    setActiveCalendarView: setCalendarView,
    setSpaceContext: setSpace,
    setActiveOffshoot: setOffshoot,
    setActiveSideProject: setSideProject,
    resetTrackContext: resetTrack,
    resetTaskContext: resetTask,
    resetFocusContext: resetFocus,
    resetOffshootContext: resetOffshoot,
    resetSideProjectContext: resetSideProject,
    resetAll: resetAllADC,
    subscribe: subscribeToADC,
  };

  return (
    <ActiveDataContext.Provider value={value}>
      {children}
    </ActiveDataContext.Provider>
  );
}

export function useActiveData(): ActiveDataContextType {
  const context = useContext(ActiveDataContext);
  if (!context) {
    throw new Error('useActiveData must be used within ActiveDataProvider');
  }
  return context;
}

export function useADCState(): ADCState {
  const { state } = useActiveData();
  return state;
}

export function useADCSubscription<T extends ADCEventName>(
  eventName: T,
  callback: ADCEventCallback<T>
): void {
  const { subscribe } = useActiveData();

  useEffect(() => {
    const unsubscribe = subscribe(eventName, callback);
    return unsubscribe;
  }, [eventName, callback, subscribe]);
}
