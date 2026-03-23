import { useState, useEffect } from 'react';
import { getADCState, subscribeToADC } from './activeDataContext';
import type { ADCState, ADCEventName } from './activeDataContext.types';

export function useActiveDataContext(): ADCState {
  const [state, setState] = useState<ADCState>(getADCState());

  useEffect(() => {
    const events: ADCEventName[] = [
      'projectChanged',
      'trackChanged',
      'subtrackChanged',
      'taskChanged',
      'focusModeChanged',
      'timeBlockChanged',
      'calendarViewChanged',
      'spaceChanged',
      'offshootChanged',
      'sideProjectChanged',
    ];

    const unsubscribers = events.map(event =>
      subscribeToADC(event, () => {
        setState(getADCState());
      })
    );

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, []);

  return state;
}
