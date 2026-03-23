# Daily Alignment Feature Enhancements

## Overview
The Daily Alignment feature has been significantly enhanced with a hierarchical work structure, calendar synchronization, customizable working hours, and a more interactive, visually appealing UI.

## New Features

### 1. Hierarchical Work Structure
Projects now display as collapsible dropdown menus with nested tracks, subtracks, and tasks.

**Key Features:**
- Projects expand to show all tracks
- Tracks expand to show subtracks and tasks
- Visual hierarchy with distinct icons and colors:
  - Projects: Blue folder icon
  - Tracks: Green list icon
  - Subtracks: Amber target icon
  - Tasks: Orange checkbox icon
- Search across all levels
- Drag and drop from any level to the calendar

**Component:** `AlignmentWorkPickerHierarchical.tsx`

### 2. Calendar Synchronization
Calendar events now display directly in the Daily Alignment and sync in real-time.

**Features:**
- Shows all calendar events for the current day
- Events display with blue gradient background
- Real-time updates using Supabase subscriptions
- Events cannot be moved or deleted from alignment view
- Clear visual distinction between calendar events and alignment blocks

**How It Works:**
- Listens to calendar_events table changes
- Automatically refreshes when events are added/updated/deleted
- Displays events in their scheduled time slots

### 3. Working Hours & Break Settings
Users can now configure default settings for working hours and breaks.

**Settings Available:**
- **Working Hours**: Start and end time (default: 9 AM - 5 PM)
- **Lunch Break**: Start time and duration (default: 12 PM, 60 minutes)
- **Morning Break**: Optional, with start time and duration
- **Afternoon Break**: Optional, with start time and duration
- **Blocked Time Slots**: Custom time blocks (e.g., school pickup, appointments)

**Visual Indicators:**
- Non-working hours: Gray background
- Lunch break: Amber background with utensils icon
- Morning/afternoon breaks: Green background with coffee icon
- Blocked times: Red background with clock icon and custom label

**Access:** Click "Settings" button in the calendar spine header

**Database:** `daily_alignment_settings` table

### 4. Enhanced UI Design

**Header:**
- Gradient background (blue)
- Calendar icon badge
- Improved button styling with hover effects
- Better visual hierarchy

**Work Picker:**
- Gradient background
- Smooth collapsible animations
- Search with better visual feedback
- Card-based layout with shadows
- Color-coded item types

**Calendar Spine:**
- Bordered time slots with hour labels
- Color-coded time blocks
- Visual distinction for different types:
  - Calendar events: Blue gradient with left border
  - Alignment blocks: White with border
  - Breaks: Colored backgrounds
  - Empty slots: Dashed border with hover effect
- Better spacing and readability

**Settings Modal:**
- Categorized sections with color coding
- Time pickers for easy configuration
- Add/remove custom blocked times
- Immediate visual feedback

## Database Schema

### New Table: `daily_alignment_settings`
Stores user preferences for working hours and breaks.

**Columns:**
- `id` (uuid, primary key)
- `user_id` (uuid, references auth.users)
- `work_start_time` (time, default '09:00:00')
- `work_end_time` (time, default '17:00:00')
- `lunch_break_start` (time, default '12:00:00')
- `lunch_break_duration` (integer, default 60)
- `enable_morning_break` (boolean, default false)
- `morning_break_start` (time, default '10:30:00')
- `morning_break_duration` (integer, default 15)
- `enable_afternoon_break` (boolean, default false)
- `afternoon_break_start` (time, default '15:00:00')
- `afternoon_break_duration` (integer, default 15)
- `blocked_times` (jsonb, array of {start_time, end_time, label})

**Security:** Full RLS policies for authenticated users

## Service Functions

### New Functions in `dailyAlignmentService.ts`:

**`getHierarchicalWorkItems(userId: string)`**
- Returns projects with nested tracks, subtracks, and tasks
- Organizes data in a tree structure for easy display

**`getAlignmentSettings(userId: string)`**
- Retrieves user's alignment settings
- Creates default settings if none exist

**`updateAlignmentSettings(userId, updates)`**
- Updates user's alignment settings
- Validates and saves preferences

## User Experience

### Planning Your Day:

1. **View Available Work**
   - Expand projects to see tracks
   - Expand tracks to see subtracks and tasks
   - Use search to find specific items

2. **Add to Calendar**
   - Drag any item (project, track, subtrack, or task) to a time slot
   - Choose duration (15 min, 30 min, 1 hour, half day, all day)
   - Item appears in the schedule

3. **View Calendar Events**
   - Existing calendar events display automatically
   - Blue gradient background distinguishes them from alignment blocks
   - Shows exact start and end times

4. **Manage Settings**
   - Click "Settings" button
   - Configure working hours
   - Enable/disable breaks
   - Add custom blocked times (appointments, meetings, etc.)
   - Settings apply visual indicators to calendar

5. **Complete Alignment**
   - Hide for now: Collapses panel, can be reopened
   - Dismiss for today: Hides until tomorrow
   - Complete alignment: Marks as done, enables progress tracking

### Benefits:

- **Better Organization**: Hierarchical structure makes finding work easier
- **Context Awareness**: See calendar commitments while planning
- **Time Blocking**: Automatic visual indicators for non-working time
- **Flexibility**: Completely optional and non-judgmental
- **Realistic Planning**: Work hours and breaks help set achievable goals

## Technical Details

### New Components:
1. `AlignmentWorkPickerHierarchical.tsx` - Hierarchical work item display
2. `AlignmentCalendarSpineEnhanced.tsx` - Enhanced calendar with settings support
3. `AlignmentSettingsModal.tsx` - Settings configuration modal

### Modified Components:
1. `DailyAlignmentPanel.tsx` - Uses new components, adds real-time sync

### Type Additions:
- `ProjectWithTracks` - Project with nested structure
- `TrackWithSubtracks` - Track with subtracks and tasks
- `SubtrackItem` - Subtrack details
- `TaskItem` - Task details
- `DailyAlignmentSettings` - User settings
- `BlockedTime` - Custom blocked time slot

### Real-Time Sync:
Uses Supabase real-time subscriptions to listen for calendar_events changes and automatically refresh the view.

## Migration

**File:** `20251216180000_create_daily_alignment_settings.sql`

Creates the settings table with:
- Default working hours (9 AM - 5 PM)
- Default lunch break (12 PM, 60 minutes)
- Optional morning and afternoon breaks
- Custom blocked times support
- Full RLS policies

## How to Use

### As a User:

1. **Navigate to Dashboard**
   - Daily Alignment panel appears at the top (if enabled)

2. **Explore Work Items**
   - Click project names to expand
   - Click track names to expand
   - See all subtracks and tasks nested inside

3. **Plan Your Day**
   - Drag items to time slots
   - Calendar events show automatically
   - Working hours and breaks are visually indicated

4. **Customize Settings**
   - Click "Settings" in calendar header
   - Adjust working hours to match your schedule
   - Enable breaks as needed
   - Add blocked times for appointments

5. **Complete Your Alignment**
   - Use "Hide for now" if you want to come back later
   - Use "Dismiss for today" if you don't want to plan today
   - Use "Complete alignment" when you're satisfied with your plan

### Default Behavior:

- Enabled by default for all users
- Can be disabled in Settings
- Appears once per day
- Remembers your choices (hidden, dismissed, completed)
- Settings persist across days

## Accessibility

- Keyboard navigation supported
- Clear visual hierarchy
- Color is not the only indicator (icons + text)
- Responsive design for all screen sizes
- Hover states for better interaction feedback

## Performance

- Lazy loading of hierarchical data
- Efficient real-time subscriptions
- Optimized queries with proper indexing
- Debounced search
- Smooth animations (no janky transitions)

## Future Enhancements

Possible additions:
- Drag to reorder blocks
- Estimated time vs actual time tracking
- Weekly view
- Templates for common days
- Integration with focus mode
- Productivity insights
