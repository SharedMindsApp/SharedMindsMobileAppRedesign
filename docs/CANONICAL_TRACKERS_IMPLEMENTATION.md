# Canonical Habit & Goal Trackers Implementation

## Overview

Unified canonical HabitTracker and GoalTracker components that work identically across Planner, Personal Spaces, and Shared Spaces. Zero duplication, zero feature drift.

## Architecture

### Core Components (All Logic)

**`src/components/activities/habits/HabitTrackerCore.tsx`**
- Contains ALL habit tracking logic
- Never knows where it's rendered
- Accepts: `ownerUserId`, `context`, `permissions`, `layout`
- Enforces permissions internally
- Handles check-ins, streaks, progress computation

**`src/components/activities/goals/GoalTrackerCore.tsx`**
- Contains ALL goal tracking logic
- Never knows where it's rendered
- Accepts: `ownerUserId`, `context`, `permissions`, `layout`
- Enforces permissions internally
- Handles progress computation, requirements, completion

### Shell Components (Thin Wrappers)

**Planner:**
- `src/components/planner/widgets/HabitTrackerWidget.tsx`
- `src/components/planner/widgets/GoalTrackerWidget.tsx`
- Resolves permissions (full access for owner)
- Passes props to Core

**Personal Spaces:**
- `src/components/personal-spaces/widgets/HabitTrackerWidget.tsx`
- `src/components/personal-spaces/widgets/GoalTrackerWidget.tsx`
- Resolves permissions (full access for owner)
- Uses `compact` layout by default

**Shared Spaces:**
- `src/components/shared/widgets/HabitTrackerWidget.tsx`
- `src/components/shared/widgets/GoalTrackerWidget.tsx`
- Accepts `permissions` prop (from sharing rules)
- Uses `compact` layout by default
- Respects `detail_level` (overview vs detailed)

## Permission Enforcement

### Internal Enforcement (Core Components)

**can_view === false:**
- Component returns `null`

**can_edit === false:**
- Disable check-in buttons
- Disable edit actions
- Show read-only banner
- Disable archive/delete

**detail_level === 'overview':**
- Hide streaks
- Hide detailed history
- Show summary only
- Hide requirement breakdowns

**can_manage === false:**
- Hide archive/delete buttons
- Disable goal completion actions

### Permission Sources

- **Planner**: Full permissions (owner)
- **Personal Spaces**: Full permissions (owner)
- **Shared Spaces**: From `PermissionFlags` prop (sharing rules)

## Calendar ↔ Tracker Synchronization

### Check-in from Tracker
1. User clicks check-in button in `HabitTrackerCore`
2. Calls `upsertHabitCheckin()` in `habitsService`
3. Calls `onHabitUpdate()` callback
4. Parent widget/calendar refreshes

### Check-in from Calendar
1. User checks in via calendar derived instance
2. Calendar calls `upsertHabitCheckin()` directly
3. Tracker auto-refreshes (via polling or real-time subscription)
4. Both views stay in sync

### Delete Habit Instance from Calendar
1. Calendar calls `deleteHabitInstanceFromCalendar()`
2. Creates/updates check-in with `status='skipped'`
3. Never deletes activity
4. Tracker shows skipped status

### Archive Habit from Tracker
1. User archives in `HabitTrackerCore`
2. Calls `archiveHabit()` in `habitsService`
3. Archives activity, hides calendar projections
4. Calendar no longer shows habit instances

## Goal ↔ Habit Coupling

### Progress Computation
- `GoalTrackerCore` calls `computeGoalProgress()`
- Reads `goal_requirements` linked to habit activities
- Computes progress from `habit_checkins`
- Updates automatically when:
  - Habit check-ins change
  - Tasks complete
  - Time advances

### Display
- Shows % completion
- Shows current streak contribution
- Shows missed days impact
- Updates in real-time

## Shared Spaces Behavior

### Overview Mode (`detail_level === 'overview'`)
- Summary only
- Hide streaks
- Hide detailed history
- Hide requirement breakdowns
- Progress bar only

### Detailed Mode (`detail_level === 'detailed'`)
- Full progress view
- Streaks visible
- History visible
- Requirement breakdowns visible

### Read-Only Mode (`can_edit === false`)
- No check-ins allowed
- No edits allowed
- Read-only banner displayed
- All actions disabled

### Manage Mode (`can_manage === false`)
- No archiving allowed
- No deletion allowed
- Archive buttons hidden

## UI Consistency

### Visual Rules
- Same charts, streak visuals, progress bars everywhere
- Same color schemes and icons
- Same interaction patterns

### Layout Differences
- **Planner**: `full` layout (default)
- **Personal Spaces**: `compact` layout (default)
- **Shared Spaces**: `compact` layout (default)

### Context Indicators
- Shared badge when `scope === 'shared'`
- Read-only badge when `can_edit === false`
- Subtle "Viewing shared data" messaging

## Feature Flags

```typescript
const FEATURE_HABITS_GOALS = false; // Enable habits/goals features
```

All components check this flag and show disabled message if false.

## Verification Checklist

Each Core component includes a checklist comment:

**HabitTrackerCore:**
- [ ] Tracker renders in Planner
- [ ] Tracker renders in Personal Space
- [ ] Tracker renders in Shared Space
- [ ] Check-ins sync both ways (tracker ↔ calendar)
- [ ] Permissions enforced correctly (can_view, can_edit, detail_level)
- [ ] No duplicate logic
- [ ] No feature drift

**GoalTrackerCore:**
- [ ] Tracker renders in Planner
- [ ] Tracker renders in Personal Space
- [ ] Tracker renders in Shared Space
- [ ] Goal progress updates from habit check-ins
- [ ] Permissions enforced correctly (can_view, can_edit, detail_level)
- [ ] No duplicate logic
- [ ] No feature drift

## Migration Path

### Old Components (Deprecated)
- `src/components/habits/HabitTracker.tsx` → Redirects to `HabitTrackerWidget`
- `src/components/goals/GoalTracker.tsx` → Redirects to `GoalTrackerWidget`

### New Components (Canonical)
- Use `HabitTrackerCore` or context-specific widgets
- Use `GoalTrackerCore` or context-specific widgets

## Files Created

### Core Components
- `src/components/activities/habits/HabitTrackerCore.tsx`
- `src/components/activities/goals/GoalTrackerCore.tsx`

### Planner Widgets
- `src/components/planner/widgets/HabitTrackerWidget.tsx`
- `src/components/planner/widgets/GoalTrackerWidget.tsx`

### Personal Spaces Widgets
- `src/components/personal-spaces/widgets/HabitTrackerWidget.tsx`
- `src/components/personal-spaces/widgets/GoalTrackerWidget.tsx`

### Shared Spaces Widgets
- `src/components/shared/widgets/HabitTrackerWidget.tsx`
- `src/components/shared/widgets/GoalTrackerWidget.tsx`

## Usage Examples

### In Planner
```tsx
import { HabitTrackerWidget } from '@/components/planner/widgets/HabitTrackerWidget';

<HabitTrackerWidget layout="full" />
```

### In Personal Spaces
```tsx
import { HabitTrackerWidget } from '@/components/personal-spaces/widgets/HabitTrackerWidget';

<HabitTrackerWidget layout="compact" />
```

### In Shared Spaces
```tsx
import { HabitTrackerWidget } from '@/components/shared/widgets/HabitTrackerWidget';

<HabitTrackerWidget
  ownerUserId={sharedUserId}
  permissions={permissionFlags}
  layout="compact"
/>
```

### Direct Core Usage (Advanced)
```tsx
import { HabitTrackerCore } from '@/components/activities/habits/HabitTrackerCore';

<HabitTrackerCore
  ownerUserId={userId}
  context={{ mode: 'planner', scope: 'self' }}
  permissions={permissions}
  layout="full"
  onHabitUpdate={() => refreshCalendar()}
/>
```

## Benefits

1. **Zero Duplication**: One source of truth for all logic
2. **Consistent Behavior**: Same features everywhere
3. **Permission-Aware**: Enforced internally, no parent responsibility
4. **Calendar Sync**: Automatic synchronization via callbacks
5. **Maintainable**: Changes in Core affect all contexts
6. **Testable**: Core components can be tested in isolation
7. **Flexible**: Easy to add new contexts (just create new shell)

## Next Steps

1. **Enable Feature Flag**: Set `FEATURE_HABITS_GOALS = true`
2. **Update Routes**: Use new widgets in Planner/Spaces pages
3. **Add Real-time Sync**: Implement WebSocket/subscription for live updates
4. **Add Tests**: Unit tests for Core components
5. **Remove Legacy**: Delete old HabitTracker/GoalTracker once migration complete




