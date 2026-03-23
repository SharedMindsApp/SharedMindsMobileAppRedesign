# Household Planner Implementation

## Overview

The Household Planner is a planner-style view layer within the Personal Planner that provides household-wide visibility of shared life logistics, powered entirely by Shared Spaces widgets.

## Architecture Principles

### Zero Duplication
- **No new tables created**: All data comes from existing `fridge_widgets` table
- **No separate household models**: Uses existing widget types filtered by space
- **Single source of truth**: Shared Spaces widgets remain authoritative
- **Permission-aware**: Respects `space_members` table for access control

### Read-Only + Light Interaction
- Primary mode is viewing/planning
- Light edits allowed: task/reminder completion toggles
- Structural changes redirect to Shared Spaces
- No enforcement mechanics or conflict resolution

## File Structure

```
src/
├── lib/
│   └── householdPlannerService.ts          # Service layer for filtered queries
└── components/
    └── planner/
        ├── PlannerHousehold.tsx            # Index page with 8 feature cards
        └── household/
            ├── HouseholdOverview.tsx       # At-a-glance dashboard
            ├── HouseholdChores.tsx         # Weekly task layout
            ├── HouseholdMeals.tsx          # Meal planner view
            ├── HouseholdGroceries.tsx      # Grocery lists view
            ├── HouseholdCleaning.tsx       # Cleaning/maintenance tasks
            ├── HouseholdAppointments.tsx   # Agenda view of events
            ├── HouseholdCalendar.tsx       # Month calendar view
            └── HouseholdNotes.tsx          # Categorized notes
```

## Service Layer (`householdPlannerService.ts`)

### Core Functions

**Space Discovery**
```typescript
getSharedSpaces(): Promise<HouseholdSpace[]>
```
- Queries user's profile ID from auth
- Finds all spaces via `space_members` table
- Filters to `space_type = 'shared'` only
- Returns accessible shared spaces

**Data Retrieval Functions**
- `getHouseholdTasks(spaceId?)` - Tasks from shared spaces
- `getHouseholdGoals(spaceId?)` - Goals with progress tracking
- `getHouseholdEvents(spaceId?, daysAhead)` - Calendar events
- `getHouseholdNotes(spaceId?)` - Note widgets
- `getHouseholdReminders(spaceId?)` - Reminder widgets
- `getHouseholdHabits(spaceId?)` - Habit tracking widgets
- `getHouseholdMealPlanners(spaceId?)` - Meal planner widgets
- `getHouseholdGroceryLists(spaceId?)` - Grocery list widgets

All functions:
- Filter by widget type
- Filter by shared space IDs
- Exclude soft-deleted widgets (`deleted_at IS NULL`)
- Include space name for attribution
- Transform widget content into typed interfaces

**Update Functions**
```typescript
updateTaskCompletion(widgetId, completed): Promise<void>
updateReminderCompletion(widgetId, completed): Promise<void>
```
- Read current widget content
- Update completion status
- Write back to `fridge_widgets` table
- Changes propagate to all Shared Spaces views

### Type System

Defines household-specific interfaces that map to widget content:
- `HouseholdTask` - From task widgets
- `HouseholdGoal` - From goal widgets
- `HouseholdEvent` - From calendar widgets
- `HouseholdNote` - From note widgets
- `HouseholdReminder` - From reminder widgets
- `HouseholdHabit` - From habit widgets

All include `space_id` and `space_name` for attribution.

## UI Components

### Index Page (`PlannerHousehold.tsx`)

Card-based navigation dashboard with 8 feature cards:
- **Household Overview** (Rose) - Home icon
- **Chores & Responsibilities** (Amber) - ClipboardList icon
- **Meal Planning** (Orange) - UtensilsCrossed icon
- **Grocery Planning** (Emerald) - ShoppingCart icon
- **Cleaning & Maintenance** (Cyan) - Sparkles icon
- **Appointments & Events** (Blue) - Calendar icon
- **Family Calendar** (Violet) - CalendarDays icon
- **Household Notes** (Pink) - StickyNote icon

Features:
- Color-coded by function
- Hover effects with scale animation
- Clear descriptions
- Bottom banner explaining data source

### 1. Household Overview

**Purpose**: See the state of the home at a glance

**Layout**: 2-column grid with 4 sections + quick stats bar

**Sections**:
- **Upcoming Events** (Blue) - Next 7 days, formatted dates
- **Pending Tasks** (Emerald) - Incomplete tasks with space attribution
- **Active Goals** (Rose) - Progress bars with percentages
- **Active Reminders** (Amber) - Priority indicators

**Quick Stats**: 4 metric cards showing counts:
- Events, Tasks, Goals, Meal Plans

**Data Refresh**: Loads all data on mount via Promise.all

### 2. Household Chores

**Purpose**: Weekly task layout with completion tracking

**Layout**: 4-column responsive grid (8 columns on large screens)

**Grouping**: Tasks organized by:
- Day of week (Mon-Sun)
- Unscheduled tasks

**Features**:
- Checkbox toggle for completion
- Visual strike-through when complete
- Color changes: incomplete (slate) → complete (amber)
- Space name attribution below each task

**Interaction**: Clicking checkbox updates widget immediately

### 3. Household Meals

**Purpose**: Read-only view of meal planner widgets

**Layout**: Vertical list of meal planner cards

**Display**:
- 7-day week grid (Mon-Sun)
- 3 meal slots per day: Breakfast, Lunch, Dinner
- Currently shows placeholders (actual meal data would come from widget content)

**Note**: This is a read-only view. Banner directs users to Shared Spaces for editing.

### 4. Household Groceries

**Purpose**: View of grocery list widgets

**Layout**: 2-column responsive grid

**Display**:
- "This Week" section
- "Later" section
- Currently shows placeholders (actual items would come from widget content)

**Note**: Read-only view. Banner directs to Shared Spaces for management.

### 5. Household Cleaning

**Purpose**: Cleaning and maintenance task tracking

**Layout**: 2-column grid

**Sections**:
- **Routine Tasks** - No due date or past due
- **Upcoming Tasks** - Future due dates

**Filtering**: Auto-detects cleaning tasks by keywords:
- "clean", "maintenance", "repair", "fix"

**Features**:
- Checkbox completion toggles
- Cyan color scheme
- Due date display for upcoming tasks
- "Planning rhythm, not nagging" messaging

### 6. Household Appointments

**Purpose**: Agenda view of upcoming events

**Layout**: Vertical timeline grouped by date

**Grouping**: Events grouped by:
- Today
- Tomorrow
- Future dates (formatted as "Monday, January 1")

**Display**:
- Event title
- Time (if specified)
- Description (if provided)
- Space attribution
- Blue dot indicators

**Time Range**: Shows next 30 days

### 7. Household Calendar

**Purpose**: Month view calendar with shared visibility

**Layout**: Full-width calendar grid

**Features**:
- Month/Week toggle buttons (Month implemented)
- Navigation: Previous/Next month, Today button
- 7-column grid (Sun-Sat)
- Each day shows up to 2 events
- "+X more" indicator for additional events
- Today highlighted with violet ring

**Event Display**:
- Blue background pills
- Time + title truncated
- Hover shows full title

**Time Range**: Shows next 60 days of events

### 8. Household Notes

**Purpose**: Categorized household notes

**Layout**: 3-column responsive grid of sticky note cards

**Filtering**: Tab-based filtering
- All Notes
- General (blue)
- Rules & Agreements (amber)
- Reminders (emerald)

**Auto-categorization**: By keywords in note text
- "rule", "agreement", "policy" → Rules
- "reminder", "remember", "don't forget" → Reminders
- Default → General

**Display**:
- Color-coded by category
- Slight rotation for visual interest
- Author attribution
- Creation date
- Space name
- Hover effect (scale up)

## Design System

### Color Palette

Soft, neutral palette with functional color-coding:
- **Rose**: Household/Overview
- **Amber**: Chores/Work tasks
- **Orange**: Meals/Food
- **Emerald**: Groceries/Shopping
- **Cyan**: Cleaning/Maintenance
- **Blue**: Events/Appointments
- **Violet**: Calendar/Time
- **Pink**: Notes/Communication

No purple/indigo hues used per design guidelines.

### Typography
- Headers: Bold, 2xl-3xl
- Subheaders: Semibold, lg-xl
- Body: Regular, sm-base
- Captions: xs, slate-500

### Spacing
- Section padding: 8 units (2rem)
- Card padding: 6 units (1.5rem)
- Gap between items: 4-6 units (1-1.5rem)
- Responsive margins scale down on mobile

### Components
- **Cards**: Rounded-xl, white background, slate-200 border
- **Icons**: Colored backgrounds matching section theme
- **Buttons**: Hover effects with border/shadow transitions
- **Empty States**: Icon + text + helpful guidance

## Permission Model

### Space Access
- Users see only spaces they're members of
- Service layer filters via `space_members` join
- No household-specific permission overrides

### Widget Visibility
- Inherits Shared Spaces RLS policies
- Users see widgets in their accessible spaces
- No additional filtering beyond space membership

### Interaction Permissions
- Task completion: Allowed for space members
- Reminder completion: Allowed for space members
- Other edits: Redirect to Shared Spaces

## Data Flow

### Read Path
1. User navigates to household page
2. Component calls service function (e.g., `getHouseholdTasks()`)
3. Service queries user's profile ID
4. Service fetches space memberships
5. Service filters to shared spaces
6. Service queries `fridge_widgets` filtered by:
   - Widget type
   - Space IDs
   - Not deleted
7. Service transforms widget content to typed interface
8. Component renders data with space attribution

### Write Path
1. User toggles task/reminder checkbox
2. Component calls update function (e.g., `updateTaskCompletion()`)
3. Service reads current widget content
4. Service updates completion field
5. Service writes back to `fridge_widgets`
6. Component refreshes data
7. Change visible in all Shared Spaces views

## Messaging Strategy

### Throughout UI
Consistent messaging that:
- Explains data source: "Powered by Shared Spaces"
- Clarifies interaction model: "Changes update the source widget"
- Guides to source: "Edit in Shared Spaces"
- Sets expectations: "Read-only view" or "Light edits allowed"

### No "Taskmaster" Vibes
- Uses "planning rhythm" language
- Focuses on visibility and alignment
- Avoids enforcement or nagging tone
- Shows status without judgment
- Presents data neutrally

## Routes

All routes added to `App.tsx`:

```
/planner/household                  → Index page
/planner/household/overview         → Overview dashboard
/planner/household/chores           → Chores & responsibilities
/planner/household/meals            → Meal planning
/planner/household/groceries        → Grocery planning
/planner/household/cleaning         → Cleaning & maintenance
/planner/household/appointments     → Appointments & events
/planner/household/calendar         → Family calendar
/planner/household/notes            → Household notes
```

All routes wrapped in `AuthGuard` and `Layout` components.

## Success Criteria

The implementation achieves all stated goals:

**See household life clearly**
- Overview shows at-a-glance status
- Dedicated views for each area
- Clear visual hierarchy

**Plan around shared responsibilities**
- Weekly layouts for tasks
- Calendar views for scheduling
- Organized by day/date/category

**Avoid double entry**
- Zero new tables created
- All data from existing widgets
- Changes sync back to source

**Feel aligned, not managed**
- Neutral, inclusive tone
- Planning language, not enforcement
- Optional visibility, not mandatory tracking

**Trust Shared Spaces as source of truth**
- Clear attribution to spaces
- "Edit in Shared Spaces" messaging
- Consistent data model

## Technical Notes

### Performance
- Uses `Promise.all` for parallel data fetching
- Filters happen in SQL via Supabase
- Minimal client-side processing
- No real-time subscriptions (pull-based refresh)

### Extensibility
- Easy to add new household view pages
- Service functions follow consistent pattern
- Type system allows safe additions
- Routes follow predictable structure

### Limitations
- No real-time updates (requires manual refresh)
- Meal/grocery widgets show placeholders (content structure TBD)
- No drag-and-drop or reordering
- No inline editing (by design)

## Future Enhancements

Potential additions outside current scope:
- Real-time subscriptions for live updates
- Inline quick-add for tasks/notes
- Advanced filtering/sorting options
- Print-friendly views
- Export functionality
- Multi-space aggregation controls
- Conflict detection for shared events

## Design Philosophy

**Personal Planner** = How I orient myself
**Shared Spaces** = How we manage things together
**Household Planner** = Where those two meet

This implementation successfully creates a bridge between personal planning and shared household management without duplicating data or creating competing systems.
