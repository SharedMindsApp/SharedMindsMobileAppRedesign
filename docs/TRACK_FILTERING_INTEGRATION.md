# Track & Subtrack Filtering Integration

## Overview

Successfully integrated universal track and subtrack filtering into the Guardrails system using the Active Data Context (ADC). This provides a consistent way to filter all Guardrails views by the currently selected track and/or subtrack.

## What Was Implemented

### 1. Enhanced ADC Persistence

**File:** `src/state/activeDataContext.ts`

**Changes:**
- Added `activeSubtrackId` to the `PERSISTED_FIELDS` array
- Now both `activeTrackId` and `activeSubtrackId` persist to localStorage
- Track context automatically resets when project changes
- Both track IDs survive page refreshes and browser restarts

**Persisted Fields:**
```typescript
const PERSISTED_FIELDS = [
  'activeProjectId',
  'activeTrackId',
  'activeSubtrackId',  // ← Added
  'activeSpaceType',
  'activeSpaceId',
  'activeCalendarView',
];
```

### 2. Created TrackSelector Component

**File:** `src/components/guardrails/TrackSelector.tsx`

A reusable horizontal track filter bar that:

**Features:**
- Shows "All Tracks" pill to clear filters
- Displays all tracks for the active project as clickable pills
- Highlights the active track with its custom color
- Shows subtracks in a collapsible second row when a track is selected
- Displays current filter state at the bottom
- Provides "Clear Filter" button
- Auto-loads tracks when project changes
- Gracefully handles no tracks scenario

**Visual Structure:**
```
[ All Tracks ] [ MVP Build ] [ Marketing ] [ Operations ] ...
     ↳ [ Research ] [ UI/UX ] [ Development ] [ Testing ]

Viewing: MVP Build → Development               Clear Filter
```

**Props:**
- `compact?: boolean` - Optional compact mode for less padding

**Track Pills:**
- Active track: Colored background with track's custom color
- Inactive tracks: Gray background with hover effect
- Smooth transitions between states

**Subtrack Pills:**
- Only shown when a track is selected
- Active subtrack: Lighter version of track color
- "All {TrackName}" pill to clear subtrack filter

### 3. Integrated TrackSelector into Roadmap

**Files:**
- `src/components/guardrails/roadmap/RoadmapPage.tsx` - Added TrackSelector
- `src/components/guardrails/roadmap/GanttViewWithTracks.tsx` - Added filtering logic

**Changes to RoadmapPage:**
- Imported and added `<TrackSelector />` after ProjectHeaderTabs
- Renders on all roadmap views

**Changes to GanttViewWithTracks:**
- Imported `useActiveDataContext` hook
- Reads `activeTrackId` and `activeSubtrackId` from ADC
- Filters `allItems` based on active track/subtrack before rendering:
  ```typescript
  const allItems = useMemo(() => {
    let items = Array.from(itemsBySectionId.values()).flat();

    if (activeTrackId) {
      items = items.filter((item) => (item as any).track_id === activeTrackId);
    }

    if (activeSubtrackId) {
      items = items.filter((item) => (item as any).subtrack_id === activeSubtrackId);
    }

    return items;
  }, [itemsBySectionId, activeTrackId, activeSubtrackId]);
  ```

**Behavior:**
- When no track selected: Shows all roadmap items
- When track selected: Shows only items in that track
- When subtrack selected: Further filters to that subtrack
- Gantt timeline automatically adjusts to filtered items
- Empty state shows when no items match filter

### 4. Integrated TrackSelector into Task Flow

**Files:**
- `src/components/guardrails/taskflow/TaskFlowPage.tsx` - Added TrackSelector
- `src/components/guardrails/taskflow/TaskFlowBoardWithTracks.tsx` - Added filtering logic

**Changes to TaskFlowPage:**
- Imported and added `<TrackSelector />` after ProjectHeaderTabs
- Added to both empty state and main render
- Renders above the Kanban board

**Changes to TaskFlowBoardWithTracks:**
- Imported `useActiveDataContext` hook
- Reads `activeTrackId` and `activeSubtrackId` from ADC
- Created `filteredItems` with track/subtrack filtering:
  ```typescript
  const filteredItems = useMemo(() => {
    let filtered = items;

    if (activeTrackId) {
      filtered = filtered.filter((item) => (item as any).track_id === activeTrackId);
    }

    if (activeSubtrackId) {
      filtered = filtered.filter((item) => (item as any).subtrack_id === activeSubtrackId);
    }

    return filtered;
  }, [items, activeTrackId, activeSubtrackId]);
  ```
- Updated `itemsByTrackId` to group `filteredItems` instead of all items
- Kanban columns automatically update based on filtered items

**Behavior:**
- When no track selected: Shows all tasks across all tracks
- When track selected: Shows only tasks in that track
- When subtrack selected: Further filters to that subtrack
- Track lanes dynamically adjust to show only filtered content
- Drag-and-drop continues to work with original items array

## How It Works

### Track Selection Flow

1. **User selects a track:**
   - Clicks track pill in TrackSelector
   - Calls `setActiveTrackId(trackId)` from ADC
   - ADC updates state and persists to localStorage
   - Emits `trackChanged` event

2. **All views react:**
   - Components using `useActiveDataContext()` re-render
   - Roadmap filters items by track
   - Task Flow filters items by track
   - TrackSelector updates visual state

3. **User selects a subtrack:**
   - Subtracks appear below selected track
   - Clicks subtrack pill
   - Calls `setActiveSubtrackId(subtrackId)` from ADC
   - ADC updates state and persists to localStorage
   - Views filter further to show only that subtrack's items

4. **User clears filter:**
   - Clicks "All Tracks" or "Clear Filter"
   - Calls `resetTrackContext()` from ADC
   - Clears both `activeTrackId` and `activeSubtrackId`
   - All views return to showing all items

### Persistence Behavior

**localStorage Keys:**
- Single key: `sharedminds_adc_state`
- Contains JSON object with all persisted ADC fields
- Includes: `activeProjectId`, `activeTrackId`, `activeSubtrackId`, etc.

**On Page Load:**
1. ADC reads from localStorage
2. Restores last selected track/subtrack
3. Components render with filters applied
4. If track was deleted, gracefully falls back to no filter

**On Project Change:**
1. `setActiveProjectId()` automatically calls `resetTrackContext()`
2. Clears track and subtrack selection
3. User must explicitly select track again for new project
4. Prevents stale track filters from previous project

## Key Design Decisions

### 1. Filtering Happens Client-Side

**Why:** The existing backend queries already return all items. Client-side filtering:
- Reuses existing API calls
- No backend changes required
- Instant filter changes (no network latency)
- Works with existing caching strategies

**Trade-off:** Loads all items upfront, but typical projects have manageable item counts.

### 2. TrackSelector is a Shared Component

**Why:** Consistency across all Guardrails views
- Same UX everywhere
- Single source of truth for track selection
- Easy to maintain and update
- Automatically syncs across views via ADC

### 3. Subtrack Filter Requires Track Filter

**Why:** Hierarchical relationship
- Subtracks belong to tracks
- Clear mental model for users
- Prevents confusion about what's being filtered
- UI clearly shows the hierarchy

### 4. ADC Manages All Track State

**Why:** Single source of truth
- No component-level track state
- All views automatically stay in sync
- Easy to debug (one place to look)
- Persistence comes for free

## Remaining Work

The following Guardrails views still need track filtering integration:

### Mind Mesh
**File:** `src/components/guardrails/GuardrailsMindMesh.tsx`

**TODO:**
- Add TrackSelector component
- Grey out nodes not in active track (50% opacity)
- Highlight nodes in active track
- Center camera on track-root nodes when switching tracks
- Do NOT hide non-track nodes (important for linking context)

**Pattern:**
```typescript
const { activeTrackId, activeSubtrackId } = useActiveDataContext();

// In node rendering:
const nodeOpacity = activeTrackId && node.track_id !== activeTrackId ? 0.5 : 1.0;
```

### Focus Mode
**Files:**
- `src/components/guardrails/focus/FocusModeStart.tsx`
- `src/components/guardrails/focus/FocusModeLive.tsx`
- `src/components/guardrails/focus/FocusSessionsHistory.tsx`
- `src/components/guardrails/focus/FocusAnalytics.tsx`

**TODO:**
- Add TrackSelector to all Focus Mode pages
- Record track_id and subtrack_id when starting focus session
- Filter session history by active track
- Show track name in session summary
- Include track breakdown in analytics

**Database Note:** Focus sessions table should already have track_id and subtrack_id fields.

### Reality Check
**File:** `src/components/guardrails/reality/ProjectRealityCheckPage.tsx`

**TODO:**
- Add TrackSelector component
- Show per-track skill coverage breakdown
- Include track-specific risk assessment
- Allow toggling between "All Tracks" and active track view

**Pattern:**
```typescript
const { activeTrackId } = useActiveDataContext();

// Filter requirements by track
const trackRequirements = activeTrackId
  ? requirements.filter(r => r.track_id === activeTrackId)
  : requirements;
```

### Sidebar Track Display
**File:** `src/components/guardrails/GuardrailsLayout.tsx`

**TODO:**
- Add collapsible "Active Track" section to sidebar
- Show current track name
- List subtracks when expanded
- Allow quick track switching from sidebar
- Collapse by default to save space

**Example Structure:**
```
Active Track: ▼
  MVP Build
    > Research
    > UI/UX
    > Development ✓ (current)
    > Testing
```

### Dashboard Track Preview
**File:** `src/components/guardrails/dashboard/ProjectCard.tsx`

**TODO:**
- Show track list when project card is expanded
- Add "Go to Track" buttons that:
  - Call `setActiveTrackId(trackId)`
  - Navigate to Roadmap view
- Display track progress indicators
- Do NOT allow track editing here (belongs in Tracks Manager)

## Developer Guide

### Adding TrackSelector to a New View

1. **Import the component:**
```typescript
import { TrackSelector } from '../TrackSelector';
```

2. **Add to render (after ProjectHeaderTabs):**
```tsx
<ProjectHeaderTabs masterProjectId={projectId} projectName={projectName} />
<TrackSelector />
```

3. **Read ADC state:**
```typescript
import { useActiveDataContext } from '../../state/useActiveDataContext';

function MyView() {
  const { activeTrackId, activeSubtrackId } = useActiveDataContext();
  // Use these IDs to filter data
}
```

### Filtering Data by Track/Subtrack

**Pattern:**
```typescript
const filteredData = useMemo(() => {
  let data = allData;

  if (activeTrackId) {
    data = data.filter(item => item.track_id === activeTrackId);
  }

  if (activeSubtrackId) {
    data = data.filter(item => item.subtrack_id === activeSubtrackId);
  }

  return data;
}, [allData, activeTrackId, activeSubtrackId]);
```

### Clearing Track Filter Programmatically

```typescript
import { resetTrackContext } from '../../state/activeDataContext';

// Clear both track and subtrack
resetTrackContext();

// Or set specific track
setActiveTrackId('track-id-here');

// Or set specific subtrack (track must be set first)
setActiveSubtrackId('subtrack-id-here');
```

### Subscribing to Track Changes

```typescript
import { useEffect } from 'react';
import { subscribeToADC } from '../../state/activeDataContext';

useEffect(() => {
  const unsubscribe = subscribeToADC('trackChanged', ({ trackId }) => {
    console.log('Track changed to:', trackId);
    // React to track change
  });

  return unsubscribe;
}, []);
```

## Testing Checklist

- [x] TrackSelector loads tracks for active project
- [x] Clicking track pill updates ADC
- [x] Roadmap filters by selected track
- [x] Task Flow filters by selected track
- [x] Subtracks appear when track is selected
- [x] Clicking subtrack further filters content
- [x] "All Tracks" clears filter
- [x] "Clear Filter" button works
- [x] Track selection persists across page refresh
- [x] Track filter resets when changing projects
- [x] Empty state shows when no items match filter
- [x] Build succeeds without errors
- [ ] Mind Mesh integration
- [ ] Focus Mode integration
- [ ] Reality Check integration
- [ ] Sidebar track display
- [ ] Dashboard track preview

## Files Changed

### Created
- `src/components/guardrails/TrackSelector.tsx` - Universal track filtering component
- `TRACK_FILTERING_INTEGRATION.md` - This documentation

### Modified
- `src/state/activeDataContext.ts` - Added `activeSubtrackId` to persistence
- `src/components/guardrails/roadmap/RoadmapPage.tsx` - Added TrackSelector
- `src/components/guardrails/roadmap/GanttViewWithTracks.tsx` - Added track filtering
- `src/components/guardrails/taskflow/TaskFlowPage.tsx` - Added TrackSelector
- `src/components/guardrails/taskflow/TaskFlowBoardWithTracks.tsx` - Added track filtering

## Performance Considerations

### Current Approach
- Client-side filtering of already-loaded items
- Filtering happens in useMemo hooks (efficient re-computation)
- No additional backend queries

### If Performance Becomes an Issue

**Option 1: Backend Filtering**
- Add track_id and subtrack_id query params to existing endpoints
- Filter at database level
- Only load needed items

**Option 2: Paginated Loading**
- Load items on-demand as user scrolls
- Filter server-side
- Cache filtered results

**Option 3: Indexed Filtering**
- Build client-side index of items by track
- O(1) lookup instead of array filtering
- Trade memory for speed

**Recommendation:** Current approach is fine for typical use (< 1000 items). Only optimize if users report slowness.

## Future Enhancements

1. **Track Quick Switcher**
   - Keyboard shortcut (e.g., `Cmd+K`)
   - Fuzzy search for tracks
   - Recent tracks list

2. **Track Bookmarks**
   - Pin frequently used tracks
   - Quick access from sidebar

3. **Multi-Track View**
   - Compare progress across tracks
   - Split-screen track comparison

4. **Track Analytics**
   - Time spent per track
   - Velocity by track
   - Completion rate by track

5. **Track-Specific Views**
   - Save custom filters per track
   - Track-specific layouts
   - Custom track dashboards

## Troubleshooting

### Track filter not showing items
- Check that items have `track_id` field set in database
- Verify track_id matches selected track
- Check browser console for filtering errors

### Track selection not persisting
- Check browser localStorage is enabled
- Verify ADC persistence is working
- Look for errors in console during page load

### Subtracks not appearing
- Ensure track is selected first
- Verify subtracks exist for selected track
- Check that `getSubTracksForTrack` returns data

### Filter not clearing
- Check that `resetTrackContext()` is called
- Verify ADC state updates correctly
- Look for stale component state

## Summary

Successfully integrated universal track and subtrack filtering into Guardrails Roadmap and Task Flow views. The TrackSelector component provides a consistent, user-friendly way to filter content across views. The Active Data Context ensures all views stay synchronized, and localStorage persistence means filters survive page refreshes.

The remaining views (Mind Mesh, Focus Mode, Reality Check) follow the same integration pattern and can be completed by following the examples in this document.

All changes are UI/state only - no database schema modifications were needed.
