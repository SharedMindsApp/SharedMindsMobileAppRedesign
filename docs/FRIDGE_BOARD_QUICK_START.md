# Fridge Board Quick Start Guide

## What is the Fridge Board?

An interactive drag-and-drop canvas where household members can arrange shared widgets in their own personal layout. Think digital refrigerator door meets personal dashboard.

## Key Concepts

1. **Content is Shared** - All household members see the same widgets
2. **Layout is Personal** - Each user arranges widgets however they want
3. **Three Size Modes** - Icon (tiny), Mini (preview), Full (detailed)
4. **Snap-to-Grid** - Magnetic feel with 50px grid cells
5. **Auto-Save** - Layout changes save immediately

## Usage

### Basic Usage

```tsx
import { FridgeBoard } from './components/fridge-board/FridgeBoard';

function MyComponent() {
  return (
    <FridgeBoard
      householdId="household-uuid"
      memberId="member-uuid"
      highContrast={false}
    />
  );
}
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `householdId` | string | UUID of the household |
| `memberId` | string | UUID of the current member |
| `highContrast` | boolean | Enable high contrast mode (optional) |

## Widget Types

The Fridge Board supports 10 widget types:

| Type | Icon | Use Case | Content Structure |
|------|------|----------|-------------------|
| **note** | StickyNote | Quick thoughts, messages | `{ text, fontSize? }` |
| **task** | CheckCircle | To-dos, action items | `{ description, completed, dueDate? }` |
| **calendar** | Calendar | Event previews | `{ eventCount, nextEvent? }` |
| **goal** | Target | Progress tracking | `{ progress, targetDate?, description? }` |
| **habit** | Flame | Streak tracking | `{ streak, lastCompleted?, frequency }` |
| **photo** | Image | Family photos | `{ imageUrl, caption? }` |
| **insight** | Sparkles | Household insights | `{ summary, category }` |
| **reminder** | Bell | Time-sensitive alerts | `{ message, time?, priority }` |
| **agreement** | FileText | Household rules | `{ rules[], agreedBy[] }` |
| **custom** | Box | Flexible content | `{ [key]: value }` |

## Size Modes

Every widget has three display states:

### Icon Mode (60x60px)
- Just an icon + key metric
- Minimal visual space
- Click to expand to Mini

### Mini Mode (150x150px)
- Compact preview
- Title + summary
- Default mode

### Full Mode (300x300px)
- Complete details
- All content visible
- Maximum information

**Toggle:** Use the 3-dot menu or click on icon mode

## Creating Widgets

### Example: Create a Note Widget

```typescript
const noteWidget = {
  household_id: "household-uuid",
  created_by: "member-uuid",
  widget_type: "note",
  title: "Grocery List",
  content: {
    text: "Milk, eggs, bread, butter",
    fontSize: "14px"
  },
  color: "yellow",
  icon: "sticky-note"
};

// Insert into database
await supabase
  .from('fridge_widgets')
  .insert(noteWidget);
```

### Example: Create a Task Widget

```typescript
const taskWidget = {
  household_id: "household-uuid",
  created_by: "member-uuid",
  widget_type: "task",
  title: "Fix the leaky faucet",
  content: {
    description: "Call plumber or do it myself",
    completed: false,
    dueDate: "2025-12-15"
  },
  color: "pink",
  icon: "check-circle"
};

await supabase
  .from('fridge_widgets')
  .insert(taskWidget);
```

### Example: Create a Goal Widget

```typescript
const goalWidget = {
  household_id: "household-uuid",
  created_by: "member-uuid",
  widget_type: "goal",
  title: "Organize Garage",
  content: {
    progress: 65,
    targetDate: "2025-12-31",
    description: "Sort, donate, and organize everything"
  },
  color: "green",
  icon: "target"
};

await supabase
  .from('fridge_widgets')
  .insert(goalWidget);
```

## Fetching Widgets with Layouts

```typescript
// Get all widgets for a household with current user's layout
const { data: widgets, error } = await supabase
  .from('fridge_widgets')
  .select(`
    *,
    layout:fridge_widget_layouts!inner(*)
  `)
  .eq('household_id', householdId)
  .eq('layout.member_id', memberId);
```

## Saving Layout Changes

```typescript
// Update widget position
await supabase
  .from('fridge_widget_layouts')
  .update({
    position_x: 100,
    position_y: 200,
    updated_at: new Date().toISOString()
  })
  .eq('widget_id', widgetId)
  .eq('member_id', memberId);

// Change size mode
await supabase
  .from('fridge_widget_layouts')
  .update({
    size_mode: 'full',
    updated_at: new Date().toISOString()
  })
  .eq('widget_id', widgetId)
  .eq('member_id', memberId);
```

## Creating Initial Layout

When a new widget is created, create a default layout for each household member:

```typescript
// After creating a widget, create layouts for all members
const { data: members } = await supabase
  .from('members')
  .select('id')
  .eq('household_id', householdId);

const layouts = members.map(member => ({
  widget_id: newWidgetId,
  member_id: member.id,
  position_x: 0,      // Top-left by default
  position_y: 0,
  size_mode: 'mini',  // Start in mini mode
  z_index: 0,
  rotation: Math.random() * 6 - 3  // Random -3° to +3°
}));

await supabase
  .from('fridge_widget_layouts')
  .insert(layouts);
```

## Grid System

- **Cell Size:** 50px × 50px
- **Snap Threshold:** 25px (snap if within this distance)
- **Desktop Grid:** 20 columns × 20 rows (1000px × 1000px)
- **Mobile Grid:** 10 columns × 15 rows (600px × 750px)

## Interactions

### Drag and Drop
1. Click/touch widget to grab
2. Drag freely (no constraints)
3. Release to drop
4. Widget snaps to nearest grid position
5. Auto-saves immediately

### Size Mode Toggle
1. Click 3-dot menu in top-right
2. Select new size mode
3. Widget animates to new size
4. Auto-saves immediately

### Bring to Front
- Click any widget to bring it to the front
- Z-index automatically increments
- Auto-saves immediately

## Accessibility

### High Contrast Mode
```tsx
<FridgeBoard
  householdId={householdId}
  memberId={memberId}
  highContrast={true}  // Enable high contrast
/>
```

### Dyslexia-Friendly Fonts
- Automatically applied to note widget text
- Font family: OpenDyslexic, Comic Sans MS, sans-serif
- Generous line spacing
- Clear letter spacing

### Future: Keyboard Navigation
- Tab to focus widgets
- Arrow keys to move
- Enter to toggle size mode
- Delete to remove

## Styling

### Widget Colors

Available colors: `yellow`, `pink`, `blue`, `green`, `orange`, `rose`, `cyan`

```typescript
{
  color: "yellow"  // Warm sticky-note yellow
}
```

### Custom Rotation

Each widget can have a slight tilt:

```typescript
{
  rotation: 2.5  // Degrees (positive = clockwise)
}
```

## Database Schema

### fridge_widgets (Shared Content)

```sql
CREATE TABLE fridge_widgets (
  id uuid PRIMARY KEY,
  household_id uuid REFERENCES households(id),
  created_by uuid REFERENCES members(id),
  widget_type text,  -- note, task, calendar, etc.
  title text,
  content jsonb,     -- Flexible widget-specific data
  color text,
  icon text,
  created_at timestamptz,
  updated_at timestamptz
);
```

### fridge_widget_layouts (Personal Layout)

```sql
CREATE TABLE fridge_widget_layouts (
  id uuid PRIMARY KEY,
  widget_id uuid REFERENCES fridge_widgets(id),
  member_id uuid REFERENCES members(id),
  position_x integer,
  position_y integer,
  size_mode text,    -- icon, mini, full
  z_index integer,
  rotation numeric,
  is_collapsed boolean,
  group_id uuid,
  updated_at timestamptz,
  UNIQUE(widget_id, member_id)
);
```

## Real-Time Updates

### Subscribe to Widget Changes

```typescript
const subscription = supabase
  .channel('fridge_widgets')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'fridge_widgets',
      filter: `household_id=eq.${householdId}`
    },
    (payload) => {
      // Handle widget content changes
      console.log('Widget updated:', payload);
    }
  )
  .subscribe();
```

### Subscribe to Layout Changes

```typescript
const layoutSubscription = supabase
  .channel('widget_layouts')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'fridge_widget_layouts',
      filter: `member_id=eq.${memberId}`
    },
    (payload) => {
      // Handle personal layout changes
      console.log('Layout updated:', payload);
    }
  )
  .subscribe();
```

## Common Patterns

### Load Fridge Board Data

```typescript
async function loadFridgeBoard(householdId: string, memberId: string) {
  // Get all widgets with user's layouts
  const { data: widgets } = await supabase
    .from('fridge_widgets')
    .select(`
      *,
      layout:fridge_widget_layouts!inner(*)
    `)
    .eq('household_id', householdId)
    .eq('layout.member_id', memberId);

  // Sort by z-index for proper stacking
  return widgets.sort((a, b) =>
    a.layout[0].z_index - b.layout[0].z_index
  );
}
```

### Add New Widget

```typescript
async function addWidget(
  householdId: string,
  memberId: string,
  widget: Partial<FridgeWidget>
) {
  // Create widget
  const { data: newWidget } = await supabase
    .from('fridge_widgets')
    .insert({
      household_id: householdId,
      created_by: memberId,
      ...widget
    })
    .select()
    .single();

  // Get all household members
  const { data: members } = await supabase
    .from('members')
    .select('id')
    .eq('household_id', householdId);

  // Create layout for each member
  const layouts = members.map(member => ({
    widget_id: newWidget.id,
    member_id: member.id,
    position_x: 0,
    position_y: 0,
    size_mode: 'mini',
    z_index: 0,
    rotation: Math.random() * 6 - 3
  }));

  await supabase
    .from('fridge_widget_layouts')
    .insert(layouts);

  return newWidget;
}
```

### Update Widget Content

```typescript
async function updateWidgetContent(
  widgetId: string,
  content: Partial<WidgetContent>
) {
  // Content changes affect all household members
  const { data } = await supabase
    .from('fridge_widgets')
    .update({
      content,
      updated_at: new Date().toISOString()
    })
    .eq('id', widgetId)
    .select()
    .single();

  return data;
}
```

### Update Personal Layout

```typescript
async function updateLayout(
  widgetId: string,
  memberId: string,
  layout: Partial<WidgetLayout>
) {
  // Layout changes only affect current user
  const { data } = await supabase
    .from('fridge_widget_layouts')
    .update({
      ...layout,
      updated_at: new Date().toISOString()
    })
    .eq('widget_id', widgetId)
    .eq('member_id', memberId)
    .select()
    .single();

  return data;
}
```

### Delete Widget

```typescript
async function deleteWidget(widgetId: string) {
  // Cascade deletes all layouts automatically
  await supabase
    .from('fridge_widgets')
    .delete()
    .eq('id', widgetId);
}
```

## Tips & Best Practices

### Performance
- Load only visible widgets on mobile
- Use virtual scrolling for 50+ widgets
- Debounce auto-save (500ms)
- Optimize drag performance (no transitions during drag)

### UX
- Default to mini mode for new widgets
- Start widgets at (0, 0) and let users arrange
- Random rotation (-3° to +3°) for playful feel
- Bring widget to front on click
- Snap to grid on drop (satisfying feedback)

### Accessibility
- Provide high contrast mode toggle
- Use dyslexia-friendly fonts
- Ensure 44px minimum touch targets
- Add keyboard navigation
- Support screen readers

### Mobile
- Larger grid cells (60px) on small screens
- Fullscreen mode recommended
- Single-finger drag only
- Bottom sheet for menus
- No hover effects (touch-friendly)

## Troubleshooting

### Widgets Not Loading
- Check household_id is correct
- Verify member_id exists in household
- Check RLS policies are set up
- Ensure layouts exist for member

### Drag Not Working
- Check event listeners are attached
- Verify boardRef is connected
- Ensure z-index is updating
- Check touch events on mobile

### Layout Not Saving
- Verify member owns the layout
- Check RLS policies allow update
- Ensure widgetId and memberId match
- Look for database errors

### Widgets Overlapping
- Snap-to-grid should prevent this
- Check position calculations
- Verify grid cell size
- Ensure proper z-index management

## Next Steps

1. **Implement Data Fetching** - Connect to Supabase
2. **Add CRUD Operations** - Create, update, delete widgets
3. **Real-Time Updates** - Live sync across users
4. **Widget Templates** - Pre-made widget types
5. **Keyboard Navigation** - Full accessibility
6. **Mobile Optimization** - Touch gestures
7. **Undo/Redo** - Layout history

## Resources

- [Full Design Documentation](./FRIDGE_BOARD_DESIGN.md)
- [TypeScript Types](./src/lib/fridgeBoardTypes.ts)
- [Main Component](./src/components/fridge-board/FridgeBoard.tsx)
- [Widget Types](./src/components/fridge-board/widgets/)

---

**Questions?** Check the full documentation or examine the component code for detailed implementation details.
