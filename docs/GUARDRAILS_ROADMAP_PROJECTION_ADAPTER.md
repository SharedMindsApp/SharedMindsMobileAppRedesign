# Roadmap Projection Adapter (Phase 0 Lock-In)

## Overview

The Roadmap Projection Adapter is a **Phase 0 architectural lock-in** component that explicitly separates:
- **Domain data** (tracks, instances, subtracks, items)
- **Per-project configuration** (visibility_state, includeInRoadmap)
- **UI-only state** (collapse, highlights) - **NEVER persisted to database**

This adapter ensures that all Roadmap UI components consume a fully-shaped, UI-safe projection structure and **never access services directly**.

## Architecture

### Separation of Concerns

```
┌─────────────────────────────────────────────────────────────┐
│                   Roadmap UI Components                      │
│  (InfiniteRoadmapView, RoadmapMobileTimeline, etc.)         │
└───────────────────────┬─────────────────────────────────────┘
                        │ Consumes
                        ▼
┌─────────────────────────────────────────────────────────────┐
│            useRoadmapProjection Hook (Adapter)               │
│  • Fetches domain data                                       │
│  • Applies visibility_state filtering                       │
│  • Merges UI state from localStorage                         │
│  • Checks permissions                                        │
│  • Returns fully-shaped projection                           │
└───────────────────────┬─────────────────────────────────────┘
                        │ Calls (Read-Only)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   Domain Services                            │
│  • getTrackTree()                                            │
│  • getRoadmapItemsByProject()                                │
│  • getTracksForProject()                                     │
│  • checkTrackEditPermission()                                │
└─────────────────────────────────────────────────────────────┘
```

## Key Principles

### 1. **UI State is NEVER Persisted to Database**

The `uiState` object (collapse, highlights, focus) is stored **only** in localStorage:
```typescript
localStorage key: `roadmap_ui_state_<projectId>`
```

⚠️ **CRITICAL**: UI state must never be written to the database. It is purely transient UI state.

### 2. **Visibility State Rules**

The adapter respects `track_project_instances.visibility_state`:

- **`visible`**: Track is included and expanded
- **`collapsed`**: Track is included but `uiState.collapsed = true`
- **`hidden`**: Track is **excluded** from projection
- **`archived`**: Track is **excluded** from projection

Manual UI collapse state (from localStorage) **overrides** instance `collapsed` state if user explicitly collapsed/expanded.

### 3. **Projection Filtering**

Tracks are included in projection only if:
1. `includeInRoadmap = true` (from instance or track)
2. `visibilityState !== 'hidden'`
3. `visibilityState !== 'archived'`

## Type Definitions

### RoadmapProjectionTrack

```typescript
interface RoadmapProjectionTrack {
  // Domain data (read-only)
  track: Track;
  instance: TrackProjectInstance | null;
  
  // Subtracks (child tracks in hierarchy)
  subtracks: RoadmapProjectionSubtrack[];
  
  // Items directly assigned to this track (not to subtracks)
  items: RoadmapItem[];
  
  // Derived (read-only)
  canEdit: boolean;
  itemCount: number;
  totalItemCount: number; // Includes items in subtracks
  
  // UI-only (NOT persisted to database)
  uiState: {
    collapsed: boolean;
    highlighted: boolean;
    focused: boolean;
  };
}
```

### RoadmapProjectionSubtrack

```typescript
interface RoadmapProjectionSubtrack {
  track: Track;
  instance: TrackProjectInstance | null;
  items: RoadmapItem[];
  itemCount: number;
  canEdit: boolean;
  
  // UI-only (NOT persisted)
  uiState: {
    collapsed: boolean;
    highlighted: boolean;
  };
}
```

## Usage

### Basic Usage

```typescript
import { useRoadmapProjection } from '../../hooks/useRoadmapProjection';

function MyRoadmapComponent({ masterProjectId }: Props) {
  const projection = useRoadmapProjection(masterProjectId);
  
  if (projection.loading) {
    return <LoadingSpinner />;
  }
  
  if (projection.error) {
    return <ErrorMessage error={projection.error} />;
  }
  
  return (
    <div>
      {projection.tracks.map(track => (
        <TrackRow key={track.track.id} projectionTrack={track} />
      ))}
    </div>
  );
}
```

### Managing UI State

```typescript
import { useRoadmapProjection, useRoadmapUIState } from '../../hooks/useRoadmapProjection';

function MyRoadmapComponent({ masterProjectId }: Props) {
  const projection = useRoadmapProjection(masterProjectId);
  const { uiState, toggleCollapse, setHighlighted } = useRoadmapUIState(masterProjectId);
  
  const handleTrackClick = (trackId: string) => {
    toggleCollapse(trackId);
    // Projection will automatically refresh with new UI state
  };
  
  return (
    <div>
      {projection.tracks.map(track => (
        <TrackRow
          key={track.track.id}
          projectionTrack={track}
          onToggleCollapse={() => handleTrackClick(track.track.id)}
        />
      ))}
    </div>
  );
}
```

## Integration Requirements

### ✅ Components MUST:

1. **Consume `useRoadmapProjection` hook** - All data comes from the projection
2. **Use `useRoadmapUIState` hook** - All UI state changes go through this hook
3. **Read from projection structure** - Never access `track`, `instance`, `items` directly from services

### ❌ Components MUST NOT:

1. **Call services directly** - No `getTrackTree()`, `getRoadmapItemsByProject()`, etc.
2. **Read raw database tables** - No direct Supabase queries
3. **Apply authority logic** - No `checkTrackEditPermission()` calls in components
4. **Mutate domain data** - No direct updates to tracks/items (use service functions, but not in Roadmap components)

## Data Flow

### Loading Flow

```
1. Component mounts
   ↓
2. useRoadmapProjection(masterProjectId) called
   ↓
3. Hook fetches domain data in parallel:
   • getTrackTree(masterProjectId)
   • getRoadmapItemsByProject(masterProjectId)
   • getTracksForProject(masterProjectId, true)
   ↓
4. Hook loads UI state from localStorage
   ↓
5. Hook builds projection tracks:
   • Applies visibility_state filtering
   • Groups items by track/subtrack
   • Checks permissions
   • Merges UI state
   ↓
6. Returns RoadmapProjection with fully-shaped data
   ↓
7. Component renders from projection
```

### UI State Update Flow

```
1. User clicks collapse button
   ↓
2. Component calls toggleCollapse(trackId)
   ↓
3. useRoadmapUIState updates localStorage
   ↓
4. useRoadmapProjection detects localStorage change (via refresh)
   ↓
5. Projection rebuilds with new UI state
   ↓
6. Component re-renders with updated projection
```

## File Structure

```
src/
├── hooks/
│   └── useRoadmapProjection.ts          # Main hook + UI state hook
└── lib/
    └── guardrails/
        └── roadmapProjectionTypes.ts    # Type definitions
```

## Refactoring Checklist

When refactoring existing Roadmap components to use the projection adapter:

- [ ] Remove direct service calls (`getTrackTree`, `getRoadmapItemsByProject`, etc.)
- [ ] Replace with `useRoadmapProjection(masterProjectId)`
- [ ] Update component props to receive `RoadmapProjectionTrack[]`
- [ ] Remove internal collapse state management
- [ ] Use `useRoadmapUIState` for collapse/highlight actions
- [ ] Update item grouping logic to use projection structure
- [ ] Remove permission checking (use `canEdit` from projection)
- [ ] Test that UI renders exactly as before

## Success Criteria

✅ Roadmap UI renders exactly as before (no visual changes)
✅ All data shaping happens in one place (the adapter)
✅ Phase-0 rules are enforced structurally (components can't bypass adapter)
✅ Future UI changes can happen without touching services
✅ UI state is clearly separated from domain state

## Phase 0 Compliance

This adapter is **Phase 0 compliant**:

- ✅ **No schema changes** - Uses existing tables and columns
- ✅ **No service refactors** - Services remain unchanged
- ✅ **No visual changes** - UI renders exactly as before
- ✅ **Structural enforcement** - Components cannot bypass the adapter
- ✅ **Clear separation** - Domain vs UI state is explicit
- ✅ **Future-ready** - Phase 1 refactor remains possible

## Known Limitations (Phase 0)

These are intentionally **not fixed** in Phase 0:

1. **No filtering by date/status** - All items are returned (filtering happens in UI)
2. **No smart collapse logic** - Simple collapse/expand only
3. **Performance** - Large projects may need optimization (Phase 1+)
4. **Caching** - No caching layer (Phase 1+)

These limitations are acceptable for Phase 0 as the goal is architectural lock-in, not feature enhancement.
