# Active Data Context (ADC) System

The Active Data Context (ADC) is a global unified state layer that keeps Spaces and Guardrails synchronized across SharedMinds.

## Architecture

### Core Components

1. **State Store** (`activeDataContext.ts`)
   - Singleton store that manages all active context data
   - Event bus for cross-module communication
   - LocalStorage persistence for session continuity
   - Automatic context reset when parent contexts change

2. **Type Definitions** (`activeDataContext.types.ts`)
   - Type-safe definitions for all ADC state fields
   - Event payload types for pub/sub system
   - Enums for focus levels, space types, task statuses, etc.

3. **React Context** (`ActiveDataContext.tsx`)
   - React wrapper for easy component integration
   - Custom hooks for accessing state and subscribing to events
   - Automatic re-rendering on state changes

## State Fields

### Project Context
- `activeProjectId`: Currently active project
- `activeDomainId`: Domain of the active project
- `activeTrackId`: Currently selected track
- `activeSubtrackId`: Currently selected subtrack

### Task Context
- `activeTaskId`: Currently selected task
- `activeTaskStatus`: Status of active task (todo, in_progress, blocked, done)

### Focus Context
- `isFocusing`: Whether a focus session is active
- `activeFocusSessionId`: ID of the current focus session
- `focusModeLevel`: Regulation level (neutral, drifting, strict)

### Time Context
- `activeTimeBlockStart`: Start time of current time block
- `activeTimeBlockEnd`: End time of current time block
- `activeCalendarView`: Current calendar view (day, week, month)

### Space Context
- `activeSpaceType`: Type of active space (personal, shared)
- `activeSpaceId`: ID of the active space

### Side Context
- `activeOffshootId`: Currently active offshoot idea
- `activeSideProjectId`: Currently active side project

## Usage Patterns

### Direct Access (Outside React)

```typescript
import {
  getADCState,
  setActiveProjectId,
  subscribeToADC
} from '@/state/activeDataContext';

// Get current state
const state = getADCState();
console.log('Active project:', state.activeProjectId);

// Update state
setActiveProjectId('project-123', 'domain-456');

// Subscribe to events
const unsubscribe = subscribeToADC('projectChanged', (payload) => {
  console.log('Project changed:', payload);
});

// Clean up
unsubscribe();
```

### React Component Access

```typescript
import { useActiveData, useADCState } from '@/contexts/ActiveDataContext';

function MyComponent() {
  // Get state and actions
  const { state, setActiveProjectId } = useActiveData();

  // Or just get state
  const adcState = useADCState();

  return (
    <div>
      <p>Active Project: {state.activeProjectId}</p>
      <button onClick={() => setActiveProjectId('new-project-id', 'domain-id')}>
        Change Project
      </button>
    </div>
  );
}
```

### Event Subscriptions

```typescript
import { useADCSubscription } from '@/contexts/ActiveDataContext';

function TaskFlowBoard() {
  useADCSubscription('taskChanged', (payload) => {
    console.log('Task changed:', payload.taskId, payload.status);
    // Refresh task list or update UI
  });

  useADCSubscription('focusModeChanged', (payload) => {
    if (payload.isFocusing) {
      // Show focus mode UI
    }
  });

  return <div>Task Flow Board</div>;
}
```

## Automatic Context Resets

When switching contexts, ADC automatically clears dependent contexts:

**Switching Projects** → Clears:
- Active track
- Active subtrack
- Active task
- Focus session
- Offshoot context
- Side project context

**Switching Tracks** → Clears:
- Active subtrack
- Active task

**Switching Subtracks** → Clears:
- Active task

This prevents stale references and ensures data consistency.

## LocalStorage Persistence

The following fields are persisted across sessions:
- `activeProjectId`
- `activeTrackId`
- `activeSpaceType`
- `activeSpaceId`
- `activeCalendarView`

Focus sessions and time blocks are intentionally **not** persisted, as they should not resume after page reload.

## Event Bus

ADC includes a lightweight event bus for cross-module communication:

**Events:**
- `projectChanged`
- `trackChanged`
- `subtrackChanged`
- `taskChanged`
- `focusModeChanged`
- `spaceChanged`
- `offshootChanged`
- `sideProjectChanged`
- `timeBlockChanged`
- `calendarViewChanged`

Modules can subscribe to these events to stay synchronized without tight coupling.

## Integration Roadmap

**Phase 1: Foundation** ✓ (This prompt)
- Core ADC store
- Type definitions
- Event bus
- LocalStorage persistence

**Phase 2: Guardrails Integration** (Future)
- Project switcher updates ADC
- Roadmap reads from ADC
- Task Flow syncs with ADC
- Focus Mode updates ADC

**Phase 3: Calendar Integration** (Future)
- Calendar widget reads ADC
- Time blocks update ADC
- Calendar view syncs with ADC

**Phase 4: Spaces Integration** (Future)
- Personal/Shared space widgets read ADC
- Widgets update when ADC changes
- Spaces update ADC when interacted with

**Phase 5: Regulation Integration** (Future)
- Regulation rules check ADC state
- Focus drift monitoring via ADC
- Context-aware regulation triggers

## Best Practices

1. **Always use setters**: Don't mutate ADC state directly
2. **Subscribe in useEffect**: Always clean up subscriptions
3. **Reset on navigation**: Clear context when leaving a module
4. **Validate IDs**: Ensure IDs exist before setting them in ADC
5. **Use TypeScript types**: Leverage type safety for all ADC operations

## Future Enhancements

Potential additions for future versions:
- State history for undo/redo
- ADC state snapshots for debugging
- Cross-tab synchronization via BroadcastChannel
- Analytics integration for context tracking
- State validation and error recovery
