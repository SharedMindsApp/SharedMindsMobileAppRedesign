# Roadmap Quick Reference

## Adding a New Roadmap Item (Code Example)

```typescript
import { createRoadmapItem } from '@/lib/guardrails/roadmapService';

async function addItem(trackId: string) {
  try {
    const item = await createRoadmapItem({
      masterProjectId: 'project-id',
      trackId: trackId,
      title: 'Implement feature X',
      startDate: '2025-12-15',
      endDate: '2025-12-22',  // or null for open-ended
      status: 'not_started',
    });

    console.log('Created:', item);
  } catch (error) {
    // Error if track doesn't have includeInRoadmap=true
    console.error(error.message);
  }
}
```

## Getting All Roadmap Items

```typescript
import { getRoadmapItemsByProject } from '@/lib/guardrails/roadmapService';

const items = await getRoadmapItemsByProject(masterProjectId);
// Returns: RoadmapItem[]
```

## Getting Track Hierarchy

```typescript
import { getTrackTree } from '@/lib/guardrails/trackService';

const tree = await getTrackTree(masterProjectId);
// Returns: TrackWithChildren[]
// Only tracks with includeInRoadmap=true should be shown
```

## Timeline Position Calculation

```typescript
import { dateToPosition, getColumnWidth } from '@/lib/guardrails/infiniteTimelineUtils';

const zoomLevel = 'week';
const columnWidth = getColumnWidth(zoomLevel);  // 120px
const today = new Date();

const itemStartDate = new Date('2025-12-15');
const xPosition = dateToPosition(itemStartDate, zoomLevel, columnWidth, today);
// Returns pixel position relative to "today" marker
```

## Filtering Tracks for Roadmap

```typescript
function shouldShowInRoadmap(track: TrackWithChildren): boolean {
  // Rule 1: Must be included in roadmap
  if (!track.includeInRoadmap) return false;

  // Rule 2: Offshoot ideas NEVER appear
  if (track.category === 'offshoot_idea') return false;

  // Rule 3: Side projects only if toggle is on
  if (track.category === 'side_project' && !showSideProjects) return false;

  return true;
}
```

## Status Colors Reference

```typescript
const STATUS_COLORS = {
  not_started: { bg: 'bg-gray-300', border: 'border-gray-400' },
  in_progress: { bg: 'bg-blue-400', border: 'border-blue-600' },
  blocked:     { bg: 'bg-red-400',  border: 'border-red-600' },
  on_hold:     { bg: 'bg-yellow-300', border: 'border-yellow-500' },
  completed:   { bg: 'bg-green-400', border: 'border-green-600' },
};
```

## Zoom Level Configuration

```typescript
type ZoomLevel = 'day' | 'week' | 'month';

const COLUMN_WIDTHS = {
  day: 60,    // pixels per day
  week: 120,  // pixels per week
  month: 180, // pixels per month
};
```

## Component Usage

```typescript
import { InfiniteRoadmapView } from '@/components/guardrails/roadmap/InfiniteRoadmapView';

<InfiniteRoadmapView masterProjectId={projectId} />
// That's it! Everything else is handled internally
```

## Common Patterns

### Checking if Track Can Have Roadmap Items

```typescript
import { getTrack } from '@/lib/guardrails/trackService';

const track = await getTrack(trackId);

if (track.includeInRoadmap) {
  // OK to create roadmap items
} else {
  // Cannot create items - track not in roadmap
  throw new Error(`Track "${track.name}" is not included in roadmap`);
}
```

### Detecting Overdue Items

```typescript
function isOverdue(item: RoadmapItem): boolean {
  if (!item.endDate) return false;
  if (item.status === 'completed') return false;
  return new Date(item.endDate) < new Date();
}
```

### Flattening Track Tree

```typescript
function flattenTree(
  tracks: TrackWithChildren[],
  depth: number = 0
): Array<TrackWithChildren & { depth: number }> {
  const result = [];

  for (const track of tracks) {
    result.push({ ...track, depth });

    if (track.children?.length > 0) {
      result.push(...flattenTree(track.children, depth + 1));
    }
  }

  return result;
}
```

## Troubleshooting

### Error: "Cannot create roadmap item for track - track is not included in roadmap"

**Cause:** Trying to attach item to track with `includeInRoadmap = false`

**Solution:**
```typescript
import { toggleTrackRoadmapVisibility } from '@/lib/guardrails/trackService';

await toggleTrackRoadmapVisibility(trackId, true);
// Now you can create items
```

### Items Not Showing

**Check:**
1. Is `track.includeInRoadmap = true`?
2. Is track category NOT 'offshoot_idea'?
3. If side project, is toggle ON?
4. Is item.trackId correct?

### Timeline Not Centered

**Cause:** Initial scroll not triggered

**Solution:** Check `hasInitializedScroll.current` ref reset on unmount

### Performance Issues

**Check:**
1. Number of visible tracks (should be < 100)
2. Number of items per track (should be < 50)
3. Browser DevTools Performance tab
4. Consider memoization of expensive calculations

## API Reference

### infiniteTimelineUtils.ts

- `getColumnWidth(zoom)` - Get pixel width for zoom level
- `startOfUnit(date, zoom)` - Snap date to unit boundary
- `addUnits(date, units, zoom)` - Add time units
- `formatColumnLabel(date, zoom)` - Format column header
- `generateTimelineColumns(config)` - Generate visible columns
- `dateToPosition(date, zoom, width, today)` - Date → pixel X
- `positionToDate(x, zoom, width, today)` - Pixel X → date
- `getTodayIndicatorPosition()` - Get today marker X position
- `isToday(date, today)` - Check if date is today
- `formatDateForDisplay(date)` - Human-readable date
- `formatDateForDB(date)` - ISO date string
- `parseDateFromDB(str)` - ISO string → Date

### roadmapService.ts

- `createRoadmapItem(input)` - Create item (validates track)
- `updateRoadmapItem(id, input)` - Update item
- `deleteRoadmapItem(id)` - Delete item
- `getRoadmapItem(id)` - Get single item
- `getRoadmapItemsByProject(projectId)` - Get all project items
- `getRoadmapItemsByTrack(trackId)` - Get track items
- `getRoadmapItemsInDateRange(projectId, start, end)` - Date filter

### trackService.ts

- `getTrackTree(projectId)` - Get full hierarchy
- `getTracksByProject(projectId)` - Get flat list
- `getTracksByCategory(projectId, category)` - Filter by category
- `toggleTrackRoadmapVisibility(trackId, include)` - Set roadmap flag
- `convertTrackToSideProject(trackId)` - Change category
- `convertTrackToOffshoot(trackId)` - Change category

## Constants

```typescript
// Layout
const ROW_HEIGHT = 48;           // pixels per track row
const SIDEBAR_WIDTH = 300;       // pixels for track sidebar

// Performance
const COLUMN_OVERSCAN = 5;       // columns rendered beyond viewport

// Defaults
const DEFAULT_ZOOM = 'week';
const DEFAULT_SHOW_SIDE_PROJECTS = true;
```
