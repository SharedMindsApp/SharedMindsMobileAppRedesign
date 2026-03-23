# Fridge Board Design Documentation

## Overview

The Fridge Board is an interactive, playful, neurodiversity-friendly canvas where household members can manipulate personal layouts of shared widgets. It combines the warmth of a physical refrigerator door with the power of digital collaboration.

## Core Concept

**Content Shared + Layout Personal**
- All household members see the same widgets (content is shared)
- Each member arranges widgets in their own personal layout
- Changes to widget content affect everyone
- Changes to layout only affect the individual user

## Design Philosophy

### Playfulness
- Magnetic fridge aesthetic with tilted widgets
- Colorful sticky-note appearance
- Smooth drag interactions with spring physics
- Gentle rotation on drag
- Satisfying snap-to-grid behavior

### Neurodiversity-Friendly
- Three size modes for cognitive load management
- High contrast mode for visibility needs
- Dyslexia-friendly fonts (OpenDyslexic, Comic Sans MS fallback)
- Generous spacing and clear visual hierarchy
- No flashing or jarring animations
- Predictable, consistent interactions

### Flexibility
- 10 different widget types
- Three size modes per widget (icon, mini, full)
- Personal arrangement freedom
- Grid-based organization with snap assistance

## Database Architecture

### Two-Table System

#### 1. `fridge_widgets` (Shared Content)

Stores the actual widget data that all household members can see and edit.

**Columns:**
- `id` - Unique widget identifier
- `household_id` - Links to household
- `created_by` - Member who created it
- `widget_type` - Type of widget (note, task, calendar, etc.)
- `title` - Widget title/heading
- `content` - JSONB flexible storage for widget-specific data
- `color` - Color theme (yellow, pink, blue, green, etc.)
- `icon` - Lucide icon name
- `created_at` / `updated_at` - Timestamps

**Security:**
- All household members can read, insert, update, and delete
- Row Level Security enforces household membership

#### 2. `fridge_widget_layouts` (Personal Layout)

Stores each user's personal arrangement of the shared widgets.

**Columns:**
- `id` - Unique layout entry
- `widget_id` - References the shared widget
- `member_id` - The specific user this layout belongs to
- `position_x` / `position_y` - Grid coordinates (50px cells)
- `size_mode` - icon, mini, or full
- `z_index` - Stacking order
- `rotation` - Slight tilt angle (degrees)
- `is_collapsed` - Collapsed state (future use)
- `group_id` - For clustering widgets (future use)
- `updated_at` - Auto-save timestamp

**Security:**
- Users can only read and modify their own layouts
- Row Level Security enforces personal ownership

**Unique Constraint:**
- `(widget_id, member_id)` - Each user has exactly one layout per widget

### Content Structure by Widget Type

All widget-specific data is stored in the flexible `content` JSONB column:

**Note:**
```json
{
  "text": "Remember to pick up groceries!",
  "fontSize": "14px"
}
```

**Task:**
```json
{
  "description": "Complete the household budget",
  "completed": false,
  "dueDate": "2025-12-15"
}
```

**Calendar:**
```json
{
  "eventCount": 5,
  "nextEvent": {
    "title": "Doctor appointment",
    "date": "2025-12-12"
  }
}
```

**Goal:**
```json
{
  "progress": 65,
  "targetDate": "2025-12-31",
  "description": "Organize the garage"
}
```

**Habit:**
```json
{
  "streak": 7,
  "lastCompleted": "2025-12-10",
  "frequency": "daily"
}
```

**Photo:**
```json
{
  "imageUrl": "https://example.com/photo.jpg",
  "caption": "Family vacation 2025"
}
```

**Insight:**
```json
{
  "summary": "Your household communication styles are highly compatible",
  "category": "Communication"
}
```

**Reminder:**
```json
{
  "message": "Soccer practice at 4pm",
  "time": "2025-12-11T16:00:00Z",
  "priority": "high"
}
```

**Agreement:**
```json
{
  "rules": [
    "Clean up after cooking",
    "Put shoes away by the door",
    "Keep music at reasonable volume"
  ],
  "agreedBy": ["member-id-1", "member-id-2"]
}
```

**Custom:**
```json
{
  "anyKey": "anyValue",
  "flexible": "structure"
}
```

## Component Architecture

### Component Hierarchy

```
FridgeBoard (Canvas)
├── Toolbar (grid toggle, fullscreen, add widget)
├── Grid Background (optional visual grid)
└── FridgeWidget (Wrapper) [for each widget]
    ├── Widget Menu (size mode toggle)
    ├── Drag Handle (entire widget)
    ├── Magnet Dot (visual flair)
    └── Widget Content (type-specific)
        ├── NoteWidget
        ├── TaskWidget
        ├── CalendarWidget
        ├── GoalWidget
        ├── HabitWidget
        ├── PhotoWidget
        ├── InsightWidget
        ├── ReminderWidget
        ├── AgreementWidget
        └── CustomWidget
```

### Files Structure

```
src/
├── lib/
│   └── fridgeBoardTypes.ts          # TypeScript types and constants
└── components/
    └── fridge-board/
        ├── FridgeBoard.tsx           # Main canvas component
        ├── FridgeWidget.tsx          # Widget wrapper with size modes
        └── widgets/
            ├── NoteWidget.tsx        # Note widget content
            ├── TaskWidget.tsx        # Task widget content
            ├── CalendarWidget.tsx    # Calendar widget content
            ├── GoalWidget.tsx        # Goal widget content
            ├── HabitWidget.tsx       # Habit widget content
            ├── PhotoWidget.tsx       # Photo widget content
            ├── InsightWidget.tsx     # Insight widget content
            ├── ReminderWidget.tsx    # Reminder widget content
            ├── AgreementWidget.tsx   # Agreement widget content
            └── CustomWidget.tsx      # Custom widget content
```

## Three Size Modes

Every widget supports three display states:

### 1. Icon Mode (60x60px)
- Tiny square showing just an icon
- Shows key metric (streak number, progress %, event count)
- Click/tap to expand to Mini mode
- Minimal cognitive load
- Great for overview

**Use Cases:**
- Quick glance at status
- Reduce visual clutter
- Keep many widgets visible
- Neurodivergent users managing overwhelm

### 2. Mini Mode (150x150px)
- Compact preview with essential info
- Title + icon + summary
- Readable without expansion
- Balanced information density

**Use Cases:**
- Most common daily view
- See multiple widgets at once
- Quick reference
- Default mode for new widgets

### 3. Full Mode (300x300px)
- Complete widget with all details
- Full text, images, lists
- Interactive elements
- Maximum information

**Use Cases:**
- Detailed viewing
- Editing content
- Reading full notes
- Viewing full photos

### Switching Between Modes

**Methods:**
1. **Click icon mode** → Expands to mini
2. **3-dot menu** → Cycle through modes
3. **Future: Pinch gesture** → Zoom in/out

## Grid System

### Grid Configuration

```typescript
{
  cellSize: 50,           // Each cell is 50x50 pixels
  snapThreshold: 25,      // Snap if within 25px of grid line
  columns: 20,            // 20 columns = 1000px width
  rows: 20                // 20 rows = 1000px height
}
```

### Snap Behavior

**During Drag:**
- Widget follows cursor freely (no constraint)
- No snapping while dragging

**On Drop:**
- Position snaps to nearest grid intersection
- Smooth spring animation to final position
- Auto-save triggers immediately

**Snap Algorithm:**
```
If (distance to grid line) < snapThreshold:
  Snap to that grid line
Else if (distance to next grid line) < snapThreshold:
  Snap to next grid line
Else:
  Stay at current position (becomes new grid-aligned position)
```

## Drag & Drop Interaction

### Drag Start
1. User presses/touches widget
2. Widget brought to front (z-index increase)
3. Cursor changes to grabbing
4. Widget gains slight scale (105%)
5. Rotation increases by 2 degrees (playful tilt)

### During Drag
1. Widget follows cursor position
2. No constraints (free movement)
3. Visual feedback: shadow increases
4. No snapping (smooth, uninterrupted)

### Drop
1. Calculate snapped position
2. Animate to snapped position (spring easing)
3. Rotation settles back to base
4. Scale returns to 100%
5. Shadow returns to normal
6. Auto-save to database

### Touch Support
- Full touch event support
- Single-finger drag
- Tap to expand (icon mode)
- Long-press to bring up menu (future)

### Mouse Support
- Click and drag
- Click icon to expand
- Right-click menu (future)
- Hover effects

## Physics & Animation

### Spring Settle
- Cubic bezier easing: `cubic-bezier(0.34, 1.56, 0.64, 1)`
- Duration: 300ms
- Feels bouncy and playful
- Not too fast (jarring) or slow (sluggish)

### Rotation
- Base rotation: -3° to +3° (random per widget)
- Dragging rotation: base + 2°
- Creates "lifted off fridge" feeling

### Scale
- Resting: 100%
- Dragging: 105%
- Hover: subtle shadow increase

### Shadow Depth
- Resting: `shadow-lg`
- Dragging: `shadow-2xl`
- Hover: `shadow-xl`

### Transitions
- Position: Only on drop (spring)
- Rotation: Always animated (300ms)
- Scale: Always animated (200ms)
- Shadow: Always animated (200ms)
- No transitions during drag (performance)

## Color System

### Widget Colors

Each widget can have one of these color schemes:

| Color  | Background      | Border           | Text             |
|--------|-----------------|------------------|------------------|
| Yellow | `bg-yellow-100` | `border-yellow-300` | `text-yellow-900` |
| Pink   | `bg-pink-100`   | `border-pink-300`   | `text-pink-900`   |
| Blue   | `bg-blue-100`   | `border-blue-300`   | `text-blue-900`   |
| Green  | `bg-green-100`  | `border-green-300`  | `text-green-900`  |
| Orange | `bg-orange-100` | `border-orange-300` | `text-orange-900` |
| Rose   | `bg-rose-100`   | `border-rose-300`   | `text-rose-900`   |
| Cyan   | `bg-cyan-100`   | `border-cyan-300`   | `text-cyan-900`   |

**Purple avoided** per design guidelines.

### Canvas Background
- Default: Gradient `from-blue-50 via-cyan-50 to-teal-50`
- Grid: Light gray lines on background
- High contrast: Black background with white text

### Magnet Dot
- Small circle at bottom-right corner
- Matches widget border color
- Visual flair mimicking fridge magnets

## Accessibility Features

### High Contrast Mode

**Toggle:** Button in toolbar

**Changes:**
- Background: Black
- Text: White
- Borders: White 2px
- Widgets: Black backgrounds
- All colors: High contrast variants
- Grid: Dark gray (#333) instead of light gray

### Dyslexia-Friendly Typography

**Font Stack:**
```css
font-family: "OpenDyslexic", "Comic Sans MS", sans-serif;
```

**Features:**
- Applied to note text content
- Generous line-height (1.6-1.8)
- Clear letter spacing
- No justified text
- Left-aligned

### Keyboard Navigation

**Planned Features:**
- Tab to focus widgets
- Arrow keys to move focused widget
- Enter to toggle size mode
- Delete to remove widget
- Escape to deselect

### Screen Reader Support

**Planned Features:**
- ARIA labels on all interactive elements
- Widget type announced
- Size mode announced
- Position announced on move
- Semantic HTML structure

### No Flashing
- No rapid color changes
- No strobing effects
- Smooth, gentle transitions only
- Respects prefers-reduced-motion

### Generous Spacing
- Widgets never overlap (grid system)
- Clear visual hierarchy
- White space between elements
- Touch targets minimum 44x44px

## Mobile vs Desktop

### Desktop (>1024px)
- Full toolbar with text labels
- Grid visible by default (optional)
- Mouse drag and drop
- Hover effects
- Right-click context menu (future)
- Larger grid (20x20 cells)

### Tablet (768-1024px)
- Compact toolbar
- Touch and mouse support
- Grid optional
- Larger touch targets
- Pinch to zoom (future)

### Mobile (<768px)
- Minimal toolbar (icons only)
- Touch-optimized
- Fullscreen mode recommended
- Smaller grid (10x10 cells)
- Swipe gestures (future)
- Bottom sheet menus

### Responsive Grid Adjustments

```typescript
Mobile:   { columns: 10, rows: 15, cellSize: 60 }
Tablet:   { columns: 15, rows: 15, cellSize: 55 }
Desktop:  { columns: 20, rows: 20, cellSize: 50 }
```

## Auto-Save System

### Save Triggers

Layout changes save immediately on:
- Widget dropped (position change)
- Size mode changed
- Widget brought to front (z-index)
- Widget collapsed/expanded
- Widget grouped/ungrouped

### Save Mechanism

**Optimistic UI:**
1. User action updates local state immediately
2. UI responds instantly (no lag)
3. Save request sent to Supabase
4. If error: rollback + show notification

**Debouncing:**
- Multiple rapid changes within 500ms
- Only last change is saved
- Reduces database writes

**Database Update:**
```typescript
await supabase
  .from('fridge_widget_layouts')
  .update({
    position_x: x,
    position_y: y,
    size_mode: mode,
    z_index: z,
    updated_at: new Date().toISOString()
  })
  .eq('widget_id', widgetId)
  .eq('member_id', memberId);
```

## Widget Type Details

### 1. Note Widget
**Icon:** StickyNote
**Color:** Yellow (default)
**Use Case:** Quick thoughts, reminders, messages

**Icon Mode:** Shows icon
**Mini Mode:** Title + 4 lines of text
**Full Mode:** Title + full scrollable text

**Content Fields:**
- `text` (string) - The note content
- `fontSize` (optional string) - Text size

### 2. Task Widget
**Icon:** CheckCircle / Circle
**Color:** Pink (default)
**Use Case:** To-dos, action items, checklists

**Icon Mode:** Checkmark if complete, circle if not
**Mini Mode:** Title + description (3 lines) + due date
**Full Mode:** Title + full description + due date

**Content Fields:**
- `description` (string) - Task details
- `completed` (boolean) - Completion status
- `dueDate` (optional string) - When it's due

### 3. Calendar Widget
**Icon:** Calendar
**Color:** Blue (default)
**Use Case:** Event count preview, next event

**Icon Mode:** Calendar icon + event count
**Mini Mode:** Event count + next event preview
**Full Mode:** Event count + full next event card

**Content Fields:**
- `eventCount` (number) - Number of events
- `nextEvent` (optional object) - { title, date }

### 4. Goal Widget
**Icon:** Target
**Color:** Green (default)
**Use Case:** Progress tracking, milestones

**Icon Mode:** Target icon + progress %
**Mini Mode:** Title + progress % + progress bar
**Full Mode:** Title + description + progress + target date

**Content Fields:**
- `progress` (number) - 0-100 percentage
- `targetDate` (optional string) - Goal deadline
- `description` (optional string) - Goal details

### 5. Habit Widget
**Icon:** Flame (streak) / TrendingUp
**Color:** Orange (default)
**Use Case:** Streak tracking, daily habits

**Icon Mode:** Flame + streak number
**Mini Mode:** Title + flame icon + streak + frequency
**Full Mode:** Title + large flame + streak + frequency + last completed

**Content Fields:**
- `streak` (number) - Current streak count
- `lastCompleted` (optional string) - Last completion date
- `frequency` (string) - daily, weekly, custom

### 6. Photo Widget
**Icon:** Image
**Color:** Orange (default)
**Use Case:** Family photos, memories, visual mementos

**Icon Mode:** Thumbnail or icon
**Mini Mode:** Image + filename
**Full Mode:** Large image + caption

**Content Fields:**
- `imageUrl` (string) - URL to image
- `caption` (optional string) - Photo description

### 7. Insight Widget
**Icon:** Sparkles / Lightbulb
**Color:** Rose (default)
**Use Case:** Household compatibility insights

**Icon Mode:** Sparkles icon
**Mini Mode:** Category badge + summary (4 lines)
**Full Mode:** Title + category badge + full summary

**Content Fields:**
- `summary` (string) - Insight text
- `category` (string) - Type of insight

### 8. Reminder Widget
**Icon:** Bell
**Color:** Pink (default)
**Use Case:** Time-sensitive alerts, notifications

**Icon Mode:** Bell icon (colored by priority)
**Mini Mode:** Title + message (3 lines) + time
**Full Mode:** Title + priority badge + full message + time

**Content Fields:**
- `message` (string) - Reminder text
- `time` (optional string) - When to remind
- `priority` (string) - low, medium, high

**Priority Colors:**
- Low: Blue
- Medium: Orange
- High: Red

### 9. Agreement Widget
**Icon:** FileText
**Color:** Blue (default)
**Use Case:** Household rules, shared agreements

**Icon Mode:** Document icon + agreed count
**Mini Mode:** Title + 2 rules + agreed count
**Full Mode:** Title + all rules + agreed members count

**Content Fields:**
- `rules` (array of strings) - List of rules
- `agreedBy` (array of strings) - Member IDs who agreed

### 10. Custom Widget
**Icon:** Box
**Color:** Cyan (default)
**Use Case:** Flexible, user-defined content

**Icon Mode:** Box icon
**Mini Mode:** Title + first 2 key-value pairs
**Full Mode:** Title + all key-value pairs in cards

**Content Fields:**
- Any flexible JSON structure
- Rendered as key-value pairs

## Future Enhancements

### Interaction Improvements
- Pinch-to-zoom for size mode changes
- Grouping widgets into clusters
- Widget rotation controls
- Custom rotation per widget
- Snap-to-widget (align edges)

### Collaboration Features
- Real-time cursors (see other members)
- Shared layout mode (everyone sees same arrangement)
- Widget comments/reactions
- Activity feed (who added/moved what)
- Undo/redo

### Customization
- Custom colors per widget
- Custom icons
- Widget templates
- Background themes
- Grid size adjustments

### Accessibility
- Complete keyboard navigation
- Screen reader optimization
- Voice control support
- Reduced motion mode
- Font size controls

### Performance
- Virtual scrolling for many widgets
- Lazy loading widget content
- Optimistic updates
- Offline mode
- Sync conflict resolution

## Implementation Status

✅ **Completed:**
- Database schema (shared content + personal layout)
- TypeScript types and constants
- Main FridgeBoard canvas component
- Drag-and-drop system with snap-to-grid
- Three size modes (icon, mini, full)
- Widget wrapper component
- All 10 widget type components
- High contrast mode
- Dyslexia-friendly typography
- Physics animations (spring, rotation, scale)
- Auto-save architecture
- Mobile and desktop responsive design
- Touch and mouse support
- Grid toggle
- Fullscreen mode
- Bring-to-front on click

🚧 **Not Implemented:**
- Data fetching from Supabase
- Creating new widgets
- Editing widget content
- Deleting widgets
- Actual auto-save API calls
- Real-time subscriptions
- Keyboard navigation
- Complete screen reader support
- Widget grouping
- Pinch gestures
- Context menus
- Undo/redo

## Testing Checklist

### Visual Design
- [ ] Widgets look like fridge magnets
- [ ] Colors are warm and inviting
- [ ] Rotation creates playful effect
- [ ] Spacing feels generous
- [ ] High contrast mode is readable
- [ ] Fonts are dyslexia-friendly

### Interactions
- [ ] Drag is smooth and responsive
- [ ] Snap-to-grid feels magnetic
- [ ] Size mode toggle works
- [ ] Bring-to-front on click
- [ ] Touch works on mobile
- [ ] Mouse works on desktop

### Size Modes
- [ ] Icon mode shows key info
- [ ] Mini mode is readable
- [ ] Full mode shows everything
- [ ] Transitions are smooth
- [ ] Click icon expands to mini

### Accessibility
- [ ] High contrast mode works
- [ ] Text is readable at all sizes
- [ ] No flashing animations
- [ ] Touch targets are large enough
- [ ] Colors have sufficient contrast

### Responsive
- [ ] Works on mobile (<768px)
- [ ] Works on tablet (768-1024px)
- [ ] Works on desktop (>1024px)
- [ ] Grid adjusts appropriately
- [ ] Touch and mouse both work

### Performance
- [ ] No lag when dragging
- [ ] Smooth animations
- [ ] Handles 20+ widgets
- [ ] No memory leaks
- [ ] Quick load times

## Design Principles Summary

1. **Content Shared, Layout Personal** - Everyone sees the same widgets, arranged differently
2. **Three Size Modes** - Icon, mini, full for cognitive load management
3. **Magnetic Grid** - Snap-to-grid with soft physics
4. **Playful Aesthetic** - Fridge magnet feel with rotation and colors
5. **Neurodiversity-Friendly** - High contrast, dyslexia fonts, generous spacing, no flashing
6. **Auto-Save** - Immediate persistence of layout changes
7. **Touch & Mouse** - Works on all devices
8. **Accessibility First** - WCAG compliant, keyboard navigable, screen reader friendly

---

**Status:** Architecture Complete ✅
**Build Status:** Passing ✅
**Ready For:** Data integration, CRUD operations, real-time features
