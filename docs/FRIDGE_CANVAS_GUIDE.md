# Fridge Canvas - Interactive Whiteboard System

## Overview

The Fridge Canvas is a full-screen, infinite canvas experience similar to Miro or Figma whiteboards. It's the central feature of SharedMinds' Household Dashboard, replacing traditional dashboard panels with an interactive, personalized workspace.

## Core Features

### 1. Infinite Canvas with Pan & Zoom
- **Full-screen interface** - Uses the entire viewport
- **Panning** - Click and drag the background, or scroll to move around
- **Zooming** - Ctrl+Scroll (or Cmd+Scroll on Mac) to zoom in/out
- **Range** - Zoom from 25% to 200%
- **Canvas Size** - 4000x4000px semi-infinite space
- **Visual Feedback** - Grid background that moves with pan, position/zoom display

### 2. Widget System

#### Widget Types
1. **Note** - Sticky notes with text content and color options
2. **Reminder** - Task reminders with due dates and completion status
3. **Calendar** - Mini calendar showing upcoming events
4. **Goal** - Progress tracking for household goals
5. **Habit** - Streak tracking for habits
6. **Photo** - Image displays with captions
7. **Insight** - Household insights and tips

#### Widget Display Modes
- **Icon Mode** (80x80px) - Minimized, shows just an icon
- **Mini Mode** (200x200px) - Compact view with essential info
- **Full Mode** (400x400px+) - Expanded view with all features

#### Widget Interactions
- **Drag & Drop** - Click and drag anywhere on the widget to move it
- **Resize** - Drag the grip handle in the bottom-right corner (mini/full mode only)
- **Rotate** - Widgets have slight random rotation for fridge-magnet feel
- **Snap to Grid** - Positions snap to 20px grid for clean alignment
- **Toggle View** - Click the maximize/minimize button to cycle between modes
- **Delete** - Click the trash icon to remove a widget
- **Edit Content** - Click inside to edit text, check boxes, update values

### 3. Floating Widget Toolbox

#### Desktop Experience
- **Location** - Bottom-right corner, floating above canvas
- **Collapsed State** - Large circular + button with gradient
- **Expanded State** - Widget options appear in a vertical list above the button
- **Animation** - Options slide in with staggered timing
- **Interaction** - Click the + button to expand/collapse

#### Mobile Experience
- **Location** - Bottom-right corner
- **Collapsed State** - Smaller circular + button
- **Expanded State** - Grid of widget options in a card overlay
- **Backdrop** - Semi-transparent backdrop for focus
- **Touch Friendly** - Larger touch targets, simpler layout

### 4. Personal Layout Per User

#### How It Works
- Each user sees the **same widget content** (notes, reminders, etc.)
- Each user has their **own widget positions, sizes, and view modes**
- Changes to widget positions are saved automatically
- Changes to widget content are shared with the household

#### Data Model
```typescript
// Shared content (visible to all household members)
fridge_widgets {
  id, household_id, created_by, widget_type, content, shared
}

// Personal layout (unique to each user)
fridge_widget_positions {
  id, widget_id, user_id, x, y, width, height, z_index,
  view_mode, rotation, collapsed
}
```

### 5. Canvas Interaction Physics

#### Fridge Magnet Feel
- **Rotation** - Widgets have random rotation (-3° to +3°) for natural placement
- **Hover Effect** - Slight counter-rotation on hover for tactile feedback
- **Shadow** - Drop shadows increase when dragging
- **Easing** - Spring-like transitions for smooth movement
- **Grid Snapping** - 20px grid prevents messy layouts

#### Touch Gestures
- **One Finger Pan** - Drag with one finger to pan canvas
- **Two Finger Pinch** - Pinch to zoom in/out
- **Double Tap** - Double tap widget to toggle view mode
- **Long Press** - Long press to show context menu (future)

### 6. Accessibility Features

#### Reduced Motion Support
- Reads from user preferences (`reduce_motion` setting)
- Disables rotation animations
- Disables transition effects
- Maintains full functionality

#### High Contrast Support
- Clear borders on all widgets
- Strong color differentiation
- Readable text at all zoom levels
- Focus indicators for keyboard navigation

#### Keyboard Navigation (Future Enhancement)
- Tab to cycle through widgets
- Arrow keys to move selected widget
- Enter to edit widget content
- Delete to remove widget
- Space to toggle view mode

## Technical Architecture

### Component Structure

```
FridgeCanvas (Main Container)
├── InfiniteCanvas (Pan/Zoom Layer)
│   └── CanvasWidget[] (Positioned Widgets)
│       ├── NoteWidget
│       ├── ReminderWidget
│       ├── CalendarCanvasWidget
│       ├── GoalCanvasWidget
│       ├── HabitCanvasWidget
│       ├── PhotoCanvasWidget
│       └── InsightCanvasWidget
└── WidgetToolbox (Floating Controls)
```

### Key Files

#### Core Components
- `FridgeCanvas.tsx` - Main container, data management
- `InfiniteCanvas.tsx` - Pan/zoom layer, gesture handling
- `CanvasWidget.tsx` - Draggable/resizable wrapper
- `WidgetToolbox.tsx` - Floating widget creation menu

#### Widget Types
- `widgets/NoteWidget.tsx`
- `widgets/ReminderWidget.tsx`
- `widgets/CalendarCanvasWidget.tsx`
- `widgets/GoalCanvasWidget.tsx`
- `widgets/HabitCanvasWidget.tsx`
- `widgets/PhotoCanvasWidget.tsx`
- `widgets/InsightCanvasWidget.tsx`

#### Data Layer
- `lib/fridgeCanvas.ts` - CRUD operations for widgets
- `lib/fridgeCanvasTypes.ts` - TypeScript definitions

#### Database
- `fridge_widgets` - Widget content storage
- `fridge_widget_positions` - User-specific layout data

### Database Schema

#### fridge_widgets Table
```sql
CREATE TABLE fridge_widgets (
  id uuid PRIMARY KEY,
  household_id uuid REFERENCES households(id),
  created_by uuid REFERENCES auth.users(id),
  widget_type widget_type NOT NULL,
  content jsonb NOT NULL,
  shared boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### fridge_widget_positions Table
```sql
CREATE TABLE fridge_widget_positions (
  id uuid PRIMARY KEY,
  widget_id uuid REFERENCES fridge_widgets(id),
  user_id uuid REFERENCES auth.users(id),
  x integer NOT NULL,
  y integer NOT NULL,
  width integer NOT NULL,
  height integer NOT NULL,
  z_index integer NOT NULL,
  view_mode widget_view_mode DEFAULT 'mini',
  rotation decimal(5,2) DEFAULT 0,
  collapsed boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(widget_id, user_id)
);
```

## Usage Guide

### For End Users

#### Getting Started
1. Navigate to **Household** in the main menu
2. You'll see an empty canvas with a welcome message
3. Click the **+ button** in the bottom-right corner
4. Choose a widget type to add (Note, Reminder, Goal, etc.)
5. The widget appears at a random position on the canvas

#### Working with Widgets
- **Move** - Click and drag the widget to reposition it
- **Resize** - Drag the grip in the bottom-right corner
- **Expand/Collapse** - Click the maximize/minimize icon
- **Edit** - Click inside the widget to edit its content
- **Delete** - Click the trash icon when hovering over the widget

#### Navigating the Canvas
- **Pan** - Scroll or click-drag the background
- **Zoom** - Hold Ctrl/Cmd and scroll
- **Reset** - Refresh the page to reset view (positions are saved)

#### Personalizing Your Layout
- Your widget positions are personal to you
- Other household members see the same widgets in different positions
- Changes to widget content (notes, reminders) are shared with everyone

### For Developers

#### Adding a New Widget Type

1. **Update the enum** in the database migration:
```sql
ALTER TYPE widget_type ADD VALUE 'my_widget';
```

2. **Create the widget component**:
```typescript
// widgets/MyWidget.tsx
export function MyWidget({ content, viewMode, onContentChange }) {
  // Implement icon, mini, and full view modes
}
```

3. **Add to FridgeCanvas** renderer:
```typescript
case 'my_widget':
  return <MyWidget content={content} viewMode={viewMode} />;
```

4. **Add to WidgetToolbox** options:
```typescript
{ type: 'my_widget', icon: MyIcon, label: 'My Widget', color: '...' }
```

#### Custom Gestures
Extend `InfiniteCanvas.tsx` to add custom gesture handlers:
```typescript
const handleCustomGesture = (e: TouchEvent) => {
  // Your custom logic
};
```

#### Modifying Physics
Adjust in `CanvasWidget.tsx`:
```typescript
const rotationStyle = position.rotation; // Change rotation
const hoverRotation = -position.rotation * 0.5; // Hover effect
const gridSize = 20; // Snap-to-grid size
```

## Performance Considerations

### Optimization Strategies
1. **Lazy Rendering** - Only render widgets in viewport (future)
2. **Debounced Updates** - Position updates are throttled
3. **Local State** - UI updates happen immediately, DB writes are async
4. **Indexed Queries** - Database indexes on household_id and user_id
5. **Minimal Re-renders** - Widget components use memo where appropriate

### Scalability Limits
- Recommended max: **50 widgets per household**
- Canvas size: **4000x4000px** (configurable)
- Tested zoom range: **0.25x to 2x**
- Update frequency: **Real-time with debouncing**

## Future Enhancements

### Planned Features
- [ ] Real-time collaboration (see others' cursors)
- [ ] Widget linking (connect related widgets)
- [ ] Templates (pre-made widget layouts)
- [ ] Export to PDF/Image
- [ ] Undo/Redo support
- [ ] Multi-select and bulk operations
- [ ] Widget search and filter
- [ ] Minimap for navigation
- [ ] Custom widget types via plugins

### Accessibility Improvements
- [ ] Full keyboard navigation
- [ ] Screen reader support
- [ ] Voice commands
- [ ] Dyslexia-friendly font options
- [ ] Color blindness modes

## Troubleshooting

### Common Issues

**Widgets not saving positions**
- Check browser console for errors
- Verify user is authenticated
- Check RLS policies in database

**Performance issues with many widgets**
- Reduce number of widgets
- Lower zoom level
- Enable reduced motion mode

**Widgets not appearing**
- Check household_id is correct
- Verify user is a household member
- Check fridge_widgets table for data

**Touch gestures not working**
- Ensure device supports touch events
- Check for conflicting event listeners
- Try refreshing the page

## Design Philosophy

The Fridge Canvas embodies several key design principles:

1. **Warmth** - Soft gradients, fridge-like colors, welcoming feel
2. **Tactility** - Physical metaphors (magnets, rotation, snapping)
3. **Personalization** - Your space, your layout, your way
4. **Collaboration** - Shared content, personal organization
5. **Simplicity** - Easy to use, hard to break
6. **Accessibility** - Works for everyone, adapts to needs

## Credits

Inspired by:
- Miro's infinite canvas
- Figma's whiteboard mode
- Physical fridge boards and corkboards
- Notion's flexible layouts

Built with:
- React + TypeScript
- Supabase (PostgreSQL + RLS)
- TailwindCSS
- Lucide Icons
