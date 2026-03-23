import { useActiveData, useADCSubscription } from '../contexts/ActiveDataContext';

/**
 * Example 1: Basic Component Usage
 * Shows how to read and update ADC state in a React component
 */
export function ProjectSwitcherExample() {
  const { state, setActiveProjectId } = useActiveData();

  const handleProjectChange = (projectId: string, domainId: string) => {
    setActiveProjectId(projectId, domainId);
  };

  return (
    <div>
      <h2>Current Project: {state.activeProjectId || 'None'}</h2>
      <button onClick={() => handleProjectChange('proj-1', 'domain-1')}>
        Switch to Project 1
      </button>
    </div>
  );
}

/**
 * Example 2: Event Subscription
 * Shows how to react to ADC state changes from other components
 */
export function TaskListExample() {
  const { state } = useActiveData();

  useADCSubscription('projectChanged', (payload) => {
    console.log('Project changed, reloading tasks...', payload.projectId);
  });

  useADCSubscription('trackChanged', (payload) => {
    console.log('Track changed, filtering tasks...', payload.trackId);
  });

  return (
    <div>
      <h3>Tasks for Track: {state.activeTrackId || 'All'}</h3>
    </div>
  );
}

/**
 * Example 3: Focus Mode Integration
 * Shows how to start/end focus sessions and track focus state
 */
export function FocusModeExample() {
  const { state, startFocusSession, endFocusSession, setFocusModeLevel } = useActiveData();

  const handleStartFocus = () => {
    const sessionId = `session-${Date.now()}`;
    startFocusSession(sessionId, 'neutral');
  };

  const handleEndFocus = () => {
    endFocusSession();
  };

  useADCSubscription('focusModeChanged', (payload) => {
    if (payload.isFocusing) {
      console.log('Focus session started:', payload.sessionId);
    } else {
      console.log('Focus session ended');
    }
  });

  return (
    <div>
      {state.isFocusing ? (
        <>
          <div>Focus Mode Active - Level: {state.focusModeLevel}</div>
          <button onClick={handleEndFocus}>End Focus</button>
          <button onClick={() => setFocusModeLevel('strict')}>Set Strict Mode</button>
        </>
      ) : (
        <button onClick={handleStartFocus}>Start Focus Session</button>
      )}
    </div>
  );
}

/**
 * Example 4: Calendar Integration
 * Shows how to sync calendar view and time blocks with ADC
 */
export function CalendarExample() {
  const { state, setActiveCalendarView, setActiveTimeBlock } = useActiveData();

  const handleViewChange = (view: 'day' | 'week' | 'month') => {
    setActiveCalendarView(view);
  };

  const handleTimeBlockSelect = (start: string, end: string) => {
    setActiveTimeBlock(start, end);
  };

  return (
    <div>
      <div>Current View: {state.activeCalendarView}</div>
      <button onClick={() => handleViewChange('day')}>Day</button>
      <button onClick={() => handleViewChange('week')}>Week</button>
      <button onClick={() => handleViewChange('month')}>Month</button>

      {state.activeTimeBlockStart && (
        <div>
          Selected Time: {state.activeTimeBlockStart} - {state.activeTimeBlockEnd}
        </div>
      )}
    </div>
  );
}

/**
 * Example 5: Multi-Context Awareness
 * Shows how a widget can respond to multiple context changes
 */
export function SmartWidgetExample() {
  const { state } = useActiveData();

  useADCSubscription('projectChanged', () => {
    console.log('Project changed - refreshing widget data');
  });

  useADCSubscription('focusModeChanged', (payload) => {
    if (payload.level === 'strict') {
      console.log('Strict mode enabled - hiding distractions');
    }
  });

  useADCSubscription('spaceChanged', (payload) => {
    console.log('Space changed to:', payload.spaceType);
  });

  return (
    <div>
      <h3>Context-Aware Widget</h3>
      <ul>
        <li>Project: {state.activeProjectId || 'None'}</li>
        <li>Track: {state.activeTrackId || 'None'}</li>
        <li>Task: {state.activeTaskId || 'None'}</li>
        <li>Focus: {state.isFocusing ? 'Active' : 'Inactive'}</li>
        <li>Space: {state.activeSpaceType}</li>
      </ul>
    </div>
  );
}

/**
 * Example 6: Context Reset
 * Shows how to programmatically reset contexts
 */
export function ContextResetExample() {
  const {
    resetTrackContext,
    resetTaskContext,
    resetFocusContext,
    resetAll,
  } = useActiveData();

  return (
    <div>
      <button onClick={resetTrackContext}>Clear Track Context</button>
      <button onClick={resetTaskContext}>Clear Task Context</button>
      <button onClick={resetFocusContext}>End Focus & Clear</button>
      <button onClick={resetAll}>Reset Everything</button>
    </div>
  );
}
