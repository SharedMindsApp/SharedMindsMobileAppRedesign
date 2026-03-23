# Daily Alignment Architecture

## Component Hierarchy

```
DailyAlignmentPanel (Main Container)
├── AlignmentWorkPickerHierarchical (Left Panel)
│   ├── Search Input
│   └── ProjectItem (Collapsible)
│       └── TrackItem (Collapsible)
│           ├── SubtrackItem (Draggable)
│           └── TaskItem (Draggable)
│
├── AlignmentCalendarSpineEnhanced (Right Panel)
│   ├── Settings Button
│   ├── Time Slots (24 hours)
│   │   ├── Calendar Events (Blue)
│   │   ├── Alignment Blocks (White)
│   │   ├── Break Indicators (Colored)
│   │   └── Drop Zones
│   └── Duration Picker Modal
│
└── AlignmentSettingsModal (Overlay)
    ├── Working Hours Section
    ├── Lunch Break Section
    ├── Morning Break Section
    ├── Afternoon Break Section
    └── Blocked Times Section
```

## Data Flow

### 1. Loading Data

```
User Opens Dashboard
    ↓
DailyAlignmentPanel.useEffect()
    ↓
├── getTodaysAlignment(userId)
│   ├── Fetch daily_alignments record
│   ├── Fetch daily_alignment_blocks
│   └── Fetch daily_alignment_microtasks
│
├── loadCalendarEvents()
│   └── Fetch calendar_events for today
│
└── Subscribe to real-time changes
    └── Refresh on calendar_events updates
```

### 2. Work Item Hierarchy

```
getHierarchicalWorkItems(userId)
    ↓
Fetch master_projects
    ↓
For each project:
    ├── Fetch guardrails_tracks_v2
    │   ↓
    │   For each track:
    │       ├── Fetch guardrails_subtracks
    │       └── Fetch roadmap_items (tasks)
    │
    └── Build nested structure
        └── Return ProjectWithTracks[]
```

### 3. Settings Management

```
User Clicks Settings
    ↓
AlignmentSettingsModal opens
    ↓
getAlignmentSettings(userId)
    ↓
├── Fetch from daily_alignment_settings
└── Create default if not exists
    ↓
User Modifies Settings
    ↓
updateAlignmentSettings(userId, updates)
    ↓
Save to database
    ↓
Close modal & refresh calendar
```

### 4. Drag and Drop Flow

```
User Drags Work Item
    ↓
handleDragStart()
    └── Store item in dataTransfer
        ↓
User Drops on Time Slot
    ↓
handleDrop(hour)
    ├── Parse dropped item
    └── Show duration picker modal
        ↓
User Selects Duration
    ↓
addBlock(alignmentId, itemType, itemId, title, time, duration)
    ├── Insert into daily_alignment_blocks
    └── Refresh alignment view
```

### 5. Calendar Sync

```
Real-Time Subscription
    ↓
supabase.channel('calendar_events_changes')
    ↓
Listen for:
    ├── INSERT
    ├── UPDATE
    └── DELETE
        ↓
    Trigger: loadCalendarEvents()
        ↓
    Refresh calendar spine with new data
```

## Database Relationships

```
auth.users
    ↓
    ├── profiles (1:1)
    │   └── daily_alignment_enabled
    │
    ├── daily_alignment_settings (1:1)
    │   └── Working hours, breaks, blocked times
    │
    ├── daily_alignments (1:many)
    │   └── One per day per user
    │       ↓
    │       └── daily_alignment_blocks (1:many)
    │           └── daily_alignment_microtasks (1:many)
    │
    ├── master_projects (1:many)
    │   └── guardrails_tracks_v2 (1:many)
    │       ├── guardrails_subtracks (1:many)
    │       └── roadmap_items (1:many)
    │
    └── calendar_events (1:many)
```

## State Management

### DailyAlignmentPanel State:
```typescript
{
  alignment: DailyAlignmentWithBlocks | null,
  calendarEvents: CalendarEvent[],
  loading: boolean,
  initializing: boolean,
  showSettings: boolean
}
```

### AlignmentWorkPickerHierarchical State:
```typescript
{
  projects: ProjectWithTracks[],
  expandedProjects: Set<string>,
  expandedTracks: Set<string>,
  searchQuery: string,
  loading: boolean
}
```

### AlignmentCalendarSpineEnhanced State:
```typescript
{
  draggedItem: WorkItem | null,
  selectedTime: string | null,
  showDurationPicker: boolean,
  settings: DailyAlignmentSettings | null
}
```

### AlignmentSettingsModal State:
```typescript
{
  settings: DailyAlignmentSettings | null,
  loading: boolean,
  saving: boolean
}
```

## Type System

### Core Types:
```typescript
// Main alignment record
DailyAlignment {
  id, user_id, date, status, completed_at, dismissed_at
}

// Block in the schedule
DailyAlignmentBlock {
  id, alignment_id, item_type, item_id, item_title,
  start_time, duration_minutes, order_index
}

// Subtask within a block
DailyAlignmentMicrotask {
  id, block_id, description, is_completed,
  completed_at, order_index
}

// Settings
DailyAlignmentSettings {
  id, user_id, work_start_time, work_end_time,
  lunch_break_start, lunch_break_duration,
  enable_morning_break, morning_break_start, morning_break_duration,
  enable_afternoon_break, afternoon_break_start, afternoon_break_duration,
  blocked_times: BlockedTime[]
}

// Hierarchical structure
ProjectWithTracks {
  id, name, tracks: TrackWithSubtracks[]
}

TrackWithSubtracks {
  id, name, projectId, projectName,
  subtracks: SubtrackItem[],
  tasks: TaskItem[]
}
```

## Service Layer

### dailyAlignmentService.ts Functions:

**Alignment Management:**
- `getTodaysAlignment(userId)` - Fetch today's alignment with blocks
- `createTodaysAlignment(userId)` - Initialize new alignment
- `dismissAlignment(alignmentId)` - Dismiss for today
- `hideAlignment(alignmentId)` - Temporarily hide
- `completeAlignment(alignmentId)` - Mark as complete

**Block Management:**
- `addBlock(alignmentId, itemType, itemId, title, time, duration)` - Add work block
- `updateBlock(blockId, updates)` - Modify block
- `deleteBlock(blockId)` - Remove block

**Microtask Management:**
- `addMicrotask(blockId, description)` - Add subtask
- `toggleMicrotask(microtaskId, isCompleted)` - Check/uncheck
- `updateMicrotask(microtaskId, description)` - Edit subtask
- `deleteMicrotask(microtaskId)` - Remove subtask

**Work Items:**
- `getAvailableWorkItems(userId)` - Flat list (legacy)
- `getHierarchicalWorkItems(userId)` - Nested structure (new)

**Settings:**
- `getAlignmentSettings(userId)` - Get user settings
- `updateAlignmentSettings(userId, updates)` - Save settings

**Preferences:**
- `getDailyAlignmentEnabled(userId)` - Check if feature enabled
- `setDailyAlignmentEnabled(userId, enabled)` - Toggle feature

## Visual Design System

### Color Palette:
- **Projects**: Blue (`bg-blue-100`, `text-blue-600`)
- **Tracks**: Green (`bg-green-100`, `text-green-600`)
- **Subtracks**: Amber (`bg-amber-100`, `text-amber-600`)
- **Tasks**: Orange (`bg-orange-100`, `text-orange-600`)
- **Calendar Events**: Blue gradient (`from-blue-50 to-blue-100`)
- **Lunch Break**: Amber (`bg-amber-50`, `border-amber-500`)
- **Coffee Breaks**: Green (`bg-green-50`, `border-green-500`)
- **Blocked Time**: Red (`bg-red-50`, `border-red-500`)
- **Non-working Hours**: Gray (`bg-gray-50`)

### Icon System:
- **Folder**: Projects
- **List**: Tracks
- **Target**: Subtracks
- **CheckSquare**: Tasks
- **Calendar**: Calendar events
- **Utensils**: Lunch break
- **Coffee**: Coffee breaks
- **Clock**: Blocked times
- **Settings**: Configuration

### Spacing:
- Card padding: `p-3`, `p-4`, `p-6`
- Gaps: `gap-2`, `gap-3`, `gap-4`
- Rounded corners: `rounded-lg`, `rounded-xl`
- Borders: `border`, `border-2`

## Performance Considerations

### Optimizations:
1. **Lazy Loading**: Only fetch data when needed
2. **Memoization**: Prevent unnecessary re-renders
3. **Indexed Queries**: Database indexes on foreign keys
4. **Debounced Search**: 300ms delay on search input
5. **Efficient Subscriptions**: Single channel for all calendar events
6. **Conditional Rendering**: Only render visible sections

### Database Indexes:
```sql
idx_daily_alignment_settings_user_id
idx_daily_alignments_user_date
idx_daily_alignment_blocks_alignment_id
idx_daily_alignment_microtasks_block_id
```

## Error Handling

### Patterns:
```typescript
try {
  // Database operation
  const { data, error } = await supabase...

  if (error) throw error;

  return data;
} catch (error) {
  console.error('[DailyAlignment] Error message:', error);
  return fallbackValue;
}
```

### User Feedback:
- Loading states: "Loading..." messages
- Empty states: Helpful placeholder text
- Error states: Graceful degradation
- Success states: Automatic updates

## Security

### RLS Policies:
All tables have policies ensuring users can only:
- View their own data
- Insert their own records
- Update their own records
- Delete their own records

### Pattern:
```sql
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id)
```

## Testing Checklist

- [ ] Create new alignment
- [ ] Drag project to calendar
- [ ] Drag track to calendar
- [ ] Drag subtrack to calendar
- [ ] Drag task to calendar
- [ ] View calendar events
- [ ] Configure working hours
- [ ] Enable/disable breaks
- [ ] Add blocked time
- [ ] Remove blocked time
- [ ] Search work items
- [ ] Expand/collapse projects
- [ ] Expand/collapse tracks
- [ ] Hide alignment
- [ ] Dismiss alignment
- [ ] Complete alignment
- [ ] Real-time calendar sync
- [ ] Settings persistence

## Key Files

**Components:**
- `src/components/regulation/DailyAlignmentPanel.tsx`
- `src/components/regulation/AlignmentWorkPickerHierarchical.tsx`
- `src/components/regulation/AlignmentCalendarSpineEnhanced.tsx`
- `src/components/regulation/AlignmentSettingsModal.tsx`
- `src/components/regulation/AlignmentBlock.tsx`

**Services:**
- `src/lib/regulation/dailyAlignmentService.ts`
- `src/lib/regulation/dailyAlignmentTypes.ts`

**Database:**
- `supabase/migrations/20251216165652_20251216161000_create_daily_alignment_stage_4_9.sql`
- `supabase/migrations/20251216180000_create_daily_alignment_settings.sql`

**Dashboards:**
- `src/components/dashboard/NDOptimizedDashboardLayout.tsx`
- `src/components/dashboard/StandardDashboardLayout.tsx`
